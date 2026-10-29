// Public templates carry the author's chosen app name. Never read private profiles.
export function templateAuthorName(template, currentUser, owned = false) {
  if (template?.starter) return "Win Today";
  const isOwner =
    owned || (!!currentUser?.uid && template?.authorId === currentUser.uid);
  if (isOwner) return currentUser?.displayName?.trim() || "You";
  return typeof template?.authorName === "string" && template.authorName.trim()
    ? template.authorName.trim()
    : "Author unavailable";
}
