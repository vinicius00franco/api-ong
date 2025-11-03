export interface Category {
  id: number;
  name: string;
  createdAt: Date;
}

export interface ICategoryRepository {
  findAll(): Promise<Category[]>;
  exists(id: number): Promise<boolean>;
}
