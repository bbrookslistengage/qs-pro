import type {
  DataExtensionFieldResponseDto,
  DataExtensionResponseDto,
  DataFolderResponseDto,
} from "@/services/metadata.types";
import previewCatalog from "@/preview/fixtures/preview-catalog.json";

export type {
  DataExtensionFieldResponseDto,
  DataExtensionResponseDto,
  DataFolderResponseDto,
};

type PreviewCatalog = {
  folders: DataFolderResponseDto[];
  dataExtensions: DataExtensionResponseDto[];
  fieldsByKey: Record<string, DataExtensionFieldResponseDto[]>;
};

function asPreviewCatalog(value: unknown): PreviewCatalog {
  return value as PreviewCatalog;
}

const catalog = asPreviewCatalog(previewCatalog);

export async function getFolders(
  _eid?: string,
): Promise<DataFolderResponseDto[]> {
  return catalog.folders;
}

export async function getDataExtensions(
  _eid: string,
): Promise<DataExtensionResponseDto[]> {
  return catalog.dataExtensions;
}

export async function getFields(
  customerKey: string,
): Promise<DataExtensionFieldResponseDto[]> {
  return catalog.fieldsByKey[customerKey] ?? [];
}
