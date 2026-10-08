export interface Category {
  id: string;
  name: string;
  createdAt: any;
}

export interface Prompt {
  id: string;
  title: string;
  prompt: string;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  storagePath?: string;
  published: boolean;
  createdAt: any;
  updatedAt: any;
  views?: number;
  useCustomViews?: boolean;
  customViews?: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  role: 'admin';
}
