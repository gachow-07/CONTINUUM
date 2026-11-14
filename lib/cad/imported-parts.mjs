/** Enumerate mesh paths deterministically within one unchanged imported model. */
export function importedParts(root) {
  const parts = [];
  function walk(node, path, parentName) {
    const name = node.name?.trim() || parentName;
    if (node.isMesh) parts.push({ key: path, name: name || `Part ${parts.length + 1}`, mesh: node });
    (node.children ?? []).forEach((child, i) => walk(child, `${path}/${i}`, name));
  }
  walk(root, "root", "");
  return parts;
}
