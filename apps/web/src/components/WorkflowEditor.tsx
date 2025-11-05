import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { TextOperation } from 'ot';

export function WorkflowEditor({ workflowId, userName }: { workflowId: string; userName: string }) {
  const [content, setContent] = useState('');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const operationsRef = useRef<TextOperation[]>([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3005');
    setSocket(newSocket);

    newSocket.emit('join_workflow', workflowId, userName);

    newSocket.on('workflow_state', (initialContent: string) => {
      setContent(initialContent);
    });

    newSocket.on('workflow_operation', (operationJson: any) => {
      const operation = TextOperation.fromJSON(operationJson);
      
      // Apply incoming operation
      setContent(prev => {
        const newContent = operation.apply(prev);
        operationsRef.current.push(operation);
        return newContent;
      });
    });

    newSocket.on('presence_update', (usersList: { id: string; name: string }[]) => {
      setUsers(usersList);
    });

    newSocket.on('workflow_history', (historyList: string[]) => {
      setHistory(historyList);
    });

    newSocket.on('workflow_restore', (content: string) => {
      setContent(content);
    });

    // Request history on mount
    newSocket.emit('request_history', workflowId);

    return () => {
      newSocket.disconnect();
    };
  }, [workflowId, userName]);

  const handleChange = (newContent: string) => {
    // Calculate changes
    const oldContent = content;
    const operation = TextOperation.diff(oldContent, newContent);
    
    // Transform against pending operations
    const transformedOp = TextOperation.transform(operation, ...operationsRef.current);
    
    // Apply locally
    setContent(transformedOp.apply(oldContent));
    operationsRef.current.push(transformedOp);
    
    // Send to server
    socket.emit('workflow_operation', workflowId, transformedOp.toJSON());
  };

  const restoreVersion = (index: number) => {
    socket.emit('restore_version', workflowId, index);
  };

  return (
    <div>
      <div className="presence-indicators">
        {users.map(user => (
          <div key={user.id} className="user-badge">
            {user.name}
          </div>
        ))}
      </div>
      
      <div className="history-panel">
        <h3>Version History</h3>
        <ul>
          {history.map((_, index) => (
            <li key={index}>
              <button onClick={() => restoreVersion(index)}>Version {index + 1}</button>
            </li>
          ))}
        </ul>
      </div>
      
      <textarea 
        value={content} 
        onChange={(e) => handleChange(e.target.value)} 
        placeholder="Edit workflow..." 
      />
    </div>
  );
}
