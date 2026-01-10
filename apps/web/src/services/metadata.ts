import api from "@/services/api";

export interface DataFolderResponseDto {
  ID?: string | number;
  Name?: string;
  ParentFolder?: { ID?: string | number } | null;
}

export interface DataExtensionResponseDto {
  CustomerKey?: string;
  Name?: string;
  CategoryID?: string | number;
}

export interface DataExtensionFieldResponseDto {
  Name?: string;
  FieldType?: string;
  MaxLength?: number | string;
  IsPrimaryKey?: boolean | string;
  IsRequired?: boolean | string;
}

export async function getFolders(eid?: string): Promise<DataFolderResponseDto[]> {
  const { data } = await api.get<DataFolderResponseDto[]>("/metadata/folders", {
    params: eid ? { eid } : undefined,
  });
  return data;
}

export async function getDataExtensions(
  eid: string,
): Promise<DataExtensionResponseDto[]> {
  const { data } = await api.get<DataExtensionResponseDto[]>(
    "/metadata/data-extensions",
    { params: { eid } },
  );
  return data;
}

export async function getFields(
  customerKey: string,
): Promise<DataExtensionFieldResponseDto[]> {
  const { data } = await api.get<DataExtensionFieldResponseDto[]>(
    "/metadata/fields",
    { params: { key: customerKey } },
  );
  return data;
}

