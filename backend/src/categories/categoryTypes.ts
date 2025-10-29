export interface Category {
  id: number;
  name: string;
  created_at: Date;
}

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  exists(id: number): Promise<boolean>;
}
