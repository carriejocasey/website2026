/**
 * The solution rotator (SolutionRotator.astro): steps through the tabs on a timer and lets
 * clicks or arrow keys jump to any of them.
 *
 * The timer only runs while the section is on screen and the tab is visible. It holds while the
 * pointer is over the art (so a slide can be studied) or keyboard focus is in the list, and it
 * never runs for people who ask for reduced motion.
 */

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function initRotator(root: HTMLElement) {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const slides = [...root.querySelectorAll<HTMLElement>('[role="tabpanel"]')];
  const panel = root.querySelector<HTMLElement>('.solution__panel');
  if (tabs.length < 2 || slides.length !== tabs.length) return;

  let index = 0;
  let timer = 0;
  let onScreen = false;
  let hovering = false;
  let keyboardFocus = false;

  function show(next: number) {
    index = (next + tabs.length) % tabs.length;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
    slides.forEach((slide, i) => {
      const on = i === index;
      slide.classList.toggle('is-active', on);
      if (on) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });
  }

  function schedule() {
    window.clearTimeout(timer);
    if (!onScreen || hovering || keyboardFocus || document.hidden || reducedMotion.matches) return;
    const duration = Number(slides[index].dataset.duration) || 6000;
    timer = window.setTimeout(() => {
      show(index + 1);
      schedule();
    }, duration);
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      if (i !== index) show(i);
      schedule();
    });
  });

  // Arrow keys move between tabs (roving tabindex), as in a standard tab list.
  root.querySelector('[role="tablist"]')?.addEventListener('keydown', (event) => {
    const e = event as KeyboardEvent;
    const keys: Record<string, number> = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    show(keys[e.key]);
    tabs[index].focus();
  });

  root.addEventListener('focusin', (e) => {
    keyboardFocus = (e.target as HTMLElement).matches(':focus-visible');
    schedule();
  });
  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget as Node | null)) keyboardFocus = false;
    schedule();
  });

  panel?.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    hovering = true;
    schedule();
  });
  panel?.addEventListener('pointerleave', () => {
    hovering = false;
    schedule();
  });

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    schedule();
  }, { threshold: 0.35 }).observe(root);

  // Hidden slides would only start loading their art once shown, so it popped in late.
  // Fetch it all as the section approaches instead.
  const preload = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    preload.disconnect();
    panel?.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
  }, { rootMargin: '100% 0px' });
  preload.observe(root);

  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', schedule);
}

export function initRotators() {
  document.querySelectorAll<HTMLElement>('[data-rotator]').forEach(initRotator);
}
