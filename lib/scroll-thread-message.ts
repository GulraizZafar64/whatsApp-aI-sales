/** Scroll a message row into view inside a scrollable chat container (not the window). */
export function scrollMessageInContainer(
  container: HTMLElement | null,
  messageEl: HTMLElement | null,
  behavior: ScrollBehavior = "smooth"
): boolean {
  if (!container || !messageEl) return false;

  const containerRect = container.getBoundingClientRect();
  const messageRect = messageEl.getBoundingClientRect();
  const offsetTop =
    messageRect.top -
    containerRect.top +
    container.scrollTop -
    container.clientHeight / 2 +
    messageEl.offsetHeight / 2;

  container.scrollTo({
    top: Math.max(0, offsetTop),
    behavior,
  });
  return true;
}
