import { getDbFromContext } from '@qpp/backend-shared';
import {
  count,
  createDatabaseFromClient,
  eq,
  folders,
  savedQueries,
} from '@qpp/database';

import type {
  CreateFolderParams,
  Folder,
  FoldersRepository,
  UpdateFolderParams,
} from './folders.repository';

type Database = ReturnType<typeof createDatabaseFromClient>;

export class DrizzleFoldersRepository implements FoldersRepository {
  constructor(private readonly db: Database) {}

  private getDb(): Database {
    return (getDbFromContext() as Database) ?? this.db;
  }

  async create(params: CreateFolderParams): Promise<Folder> {
    const result = await this.getDb()
      .insert(folders)
      .values({
        tenantId: params.tenantId,
        mid: params.mid,
        userId: params.userId,
        name: params.name,
        parentId: params.parentId ?? null,
      })
      .returning();
    const folder = result[0];
    if (!folder) {
      throw new Error('Failed to create folder');
    }
    return folder;
  }

  async findById(id: string): Promise<Folder | null> {
    const [folder] = await this.getDb()
      .select()
      .from(folders)
      .where(eq(folders.id, id))
      .limit(1);
    return folder ?? null;
  }

  async findAll(): Promise<Folder[]> {
    return this.getDb().select().from(folders);
  }

  async update(id: string, params: UpdateFolderParams): Promise<Folder | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (params.name !== undefined) {
      updateData.name = params.name;
    }
    if (params.parentId !== undefined) {
      updateData.parentId = params.parentId;
    }

    const [folder] = await this.getDb()
      .update(folders)
      .set(updateData)
      .where(eq(folders.id, id))
      .returning();
    return folder ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.getDb()
      .delete(folders)
      .where(eq(folders.id, id))
      .returning({ id: folders.id });
    return result.length > 0;
  }

  async countByUser(): Promise<number> {
    const [result] = await this.getDb()
      .select({ count: count() })
      .from(folders);
    return result?.count ?? 0;
  }

  async hasChildren(id: string): Promise<boolean> {
    // Check for child folders
    const [childFolder] = await this.getDb()
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.parentId, id))
      .limit(1);
    if (childFolder) {
      return true;
    }

    // Check for queries in this folder
    const [childQuery] = await this.getDb()
      .select({ id: savedQueries.id })
      .from(savedQueries)
      .where(eq(savedQueries.folderId, id))
      .limit(1);
    return !!childQuery;
  }
}
