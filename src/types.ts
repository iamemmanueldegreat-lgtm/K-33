export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  state: string;
  school: string;
  department: string;
  level: string;
  is_pro: boolean;
  avatar_url?: string;
  cover_url?: string;
  is_admin?: boolean;
  streak?: number;
  last_login_date?: string;
}

export interface Course {
  id: string;
  school: string;
  department: string;
  level: string;
  title: string;
  code: string;
  description: string;
  topics: Topic[];
  thumbnail?: string;
}

export interface Topic {
  id: string;
  course_id: string;
  title: string;
  content?: string;
  chapter?: string;
  chapter_order?: number;
  order?: number;
  key_takeaways?: string;
  quiz_questions?: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  isLocked: boolean;
  createdAt: any;
  updatedAt: any;
}
