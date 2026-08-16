export function isVaultBackedNote(note:{sourceId?:string|null;relativePath?:string|null}|null){
  return Boolean(note?.sourceId&&note.relativePath);
}
