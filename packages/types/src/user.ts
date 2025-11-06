export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  roles: string[];
  avatar?: string;
  preferences?: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  push: boolean;
  sms: boolean;
}

