import { useEffect, useState } from 'react';
import type { DataExtension, Folder } from '@/features/editor-workspace/types';

interface DataFolderResponse {
  ID?: string | number;
  Name?: string;
  ParentFolder?: { ID?: string | number } | null;
}

interface DataExtensionResponse {
  CustomerKey?: string;
  Name?: string;
  CategoryID?: string | number;
}

interface MetadataState {
  folders: Folder[];
  dataExtensions: DataExtension[];
  isLoading: boolean;
  error: string | null;
}

const normalizeId = (value?: string | number) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const mapFolders = (raw: DataFolderResponse[]): Folder[] => {
  return raw
    .map((item) => {
      const id = normalizeId(item.ID);
      if (!id) return null;
      const parentId = normalizeId(item.ParentFolder?.ID);
      return {
        id,
        name: item.Name ?? 'Untitled Folder',
        parentId,
        type: 'data-extension',
      };
    })
    .filter((folder): folder is Folder => Boolean(folder));
};

const mapDataExtensions = (raw: DataExtensionResponse[]): DataExtension[] => {
  return raw
    .map((item) => {
      const id = normalizeId(item.CustomerKey);
      const folderId = normalizeId(item.CategoryID);
      if (!id || !folderId) return null;
      return {
        id,
        name: item.Name ?? id,
        customerKey: id,
        folderId,
        description: '',
        fields: [],
      };
    })
    .filter((de): de is DataExtension => Boolean(de));
};

export function useMetadata(eid?: string): MetadataState {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [dataExtensions, setDataExtensions] = useState<DataExtension[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const parseJson = async (res: Response) => {
      if (!res.ok) {
        throw new Error('Metadata request failed');
      }
      return res.json();
    };

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const folderRequest = fetch('/api/metadata/folders', {
          signal: controller.signal,
          credentials: 'include',
        }).then(parseJson);

        const dataExtensionRequest = eid
          ? fetch(`/api/metadata/data-extensions?eid=${encodeURIComponent(eid)}`, {
              signal: controller.signal,
              credentials: 'include',
            }).then(parseJson)
          : Promise.resolve([] as DataExtensionResponse[]);

        const [folderData, dataExtensionData] = await Promise.all([
          folderRequest,
          dataExtensionRequest,
        ]);

        if (!isMounted) return;

        const normalizedFolders = Array.isArray(folderData)
          ? mapFolders(folderData as DataFolderResponse[])
          : [];
        const normalizedDataExtensions = Array.isArray(dataExtensionData)
          ? mapDataExtensions(dataExtensionData as DataExtensionResponse[])
          : [];

        setFolders(normalizedFolders);
        setDataExtensions(normalizedDataExtensions);
      } catch (err) {
        if (!isMounted) return;
        setError('Unable to load metadata. Showing sample data.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eid]);

  return {
    folders,
    dataExtensions,
    isLoading,
    error,
  };
}
