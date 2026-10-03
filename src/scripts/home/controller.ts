/**
 * Home stage controller: decides which state is current. All visuals are CSS keyed
 * off <main data-state>; nothing here touches styles except the measured clip box for
 * the glass cards.
 *
 * Interaction rules
 *   - A state opens only from its text ([data-trigger]), never from background imagery.
 *   - Once open, it stays open while the pointer is inside the card it opened into
 *     ([data-zone]). Text moves as the card opens, so this keeps it from slipping out
 *     from under the cursor and flickering.
 *   - Leaving the zone closes after a short grace period, so a sloppy edge doesn't snap
 *     it shut. Landing on another trigger switches straight to that state.
 *   - Keyboard: focusing anything in a section opens it; Esc closes.
 *   - Touch: tapping a heading or header label toggles it. Tapping outside closes.
 *   - Headings and header labels are buttons with aria-expanded; projects are the links.
 *   - Review helper: /#work, /#play, /#about or /#role pins that state (Esc releases).
 */
import { mountSky } from './sky';

export type HomeState = 'default' | 'work' | 'play' | 'about' | 'role';
const OPEN_STATES: HomeState[] = ['work', 'play', 'about', 'role'];

/** How long the pointer can be outside an open card before it closes (ms). */
const CLOSE_GRACE = 160;
/** Extra forgiveness around each zone (px). Glass cards also grow 12px past their box. */
const ZONE_SLOP = 12;
const INTRO_MS = 1900;
/** Hover wakes up once the photo reveal has landed, a little before the text settles. */
const INTERACTIVE_MS = 1450;
const INTRO_KEY = 'cn:intro-seen';

const isOpenState = (v: string | undefined): v is HomeState =>
  !!v && (OPEN_STATES as string[]).includes(v);

export function initHome() {
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const zones = new Map<string, HTMLElement>();
  stage.querySelectorAll<HTMLElement>('[data-zone]').forEach((el) => zones.set(el.dataset.zone!, el));
  const labels = [...stage.querySelectorAll<HTMLButtonElement>('button[data-trigger]')];

  let state: HomeState = 'default';
  let pinned = false;
  let ready = false;
  let closeTimer = 0;
  let pointer: { x: number; y: number } | null = null;
  let lastPointerType = 'mouse';

  // ---------------------------------------------------------------- state

  function set(next: HomeState) {
    window.clearTimeout(closeTimer);
    if (next === state) return;
    // CSS uses the previous state to pick transitions that depend on where we came from.
    stage!.dataset.prev = state;
    state = next;
    stage!.dataset.state = next;
    labels.forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.trigger === next)));
  }

  function scheduleClose() {
    if (closeTimer) return;
    closeTimer = window.setTimeout(() => {
      closeTimer = 0;
      set('default');
      // Whatever is under the pointer now gets a chance to open.
      if (pointer) evaluate(pointer.x, pointer.y, document.elementFromPoint(pointer.x, pointer.y));
    }, CLOSE_GRACE);
  }

  function cancelClose() {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  }

  function inZone(key: string, x: number, y: number) {
    const el = zones.get(key);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return x >= r.left - ZONE_SLOP && x <= r.right + ZONE_SLOP && y >= r.top - ZONE_SLOP && y <= r.bottom + ZONE_SLOP;
  }

  // ---------------------------------------------------------------- pointer

  function evaluate(x: number, y: number, target: Element | null) {
    if (!ready || pinned) return;
    const trigger = (target?.closest('[data-trigger]') as HTMLElement | null)?.dataset.trigger;

    if (state !== 'default' && inZone(state, x, y)) {
      cancelClose();
      return;
    }
    if (isOpenState(trigger) && trigger !== state) {
      set(trigger);
      return;
    }
    if (state !== 'default') scheduleClose();
  }

  addEventListener('pointermove', (e) => {
    lastPointerType = e.pointerType;
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    pointer = { x: e.clientX, y: e.clientY };
    evaluate(e.clientX, e.clientY, e.target as Element);
  }, { passive: true });

  addEventListener('pointerdown', (e) => { lastPointerType = e.pointerType; }, { passive: true });

  document.documentElement.addEventListener('pointerleave', () => {
    pointer = null;
    if (ready && !pinned && state !== 'default') scheduleClose();
  });

  // ---------------------------------------------------------------- touch + click

  stage.addEventListener('click', (e) => {
    const target = e.target as Element;
    const trigger = (target.closest('[data-trigger]') as HTMLElement | null)?.dataset.trigger;
    const touch = lastPointerType === 'touch' || matchMedia('(hover: none)').matches;

    if (touch) {
      // Headings and header labels are toggles.
      if (isOpenState(trigger)) {
        pinned = false;
        set(trigger === state ? 'default' : trigger);
        return;
      }
      if (!target.closest(`[data-section="${state}"]`) && !(state !== 'default' && inZone(state, e.clientX, e.clientY))) {
        set('default');
      }
      return;
    }

    // Keyboard activation (Enter / Space) toggles. A mouse click leaves it open: hover already opened it.
    if (isOpenState(trigger) && e.detail === 0) {
      set(state === trigger ? 'default' : trigger);
    }
  });

  // ---------------------------------------------------------------- keyboard

  stage.addEventListener('focusin', (e) => {
    const el = e.target as HTMLElement;
    if (!el.matches(':focus-visible')) return;
    const key = (el.closest('[data-section]') as HTMLElement | null)?.dataset.section;
    if (isOpenState(key)) { pinned = false; set(key); }
  });

  stage.addEventListener('focusout', (e) => {
    const next = e.relatedTarget as Element | null;
    if (next?.closest('[data-section]')) return;
    if (pointer && state !== 'default' && inZone(state, pointer.x, pointer.y)) return;
    if (!pinned) set('default');
  });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    pinned = false;
    set('default');
  });

  // ---------------------------------------------------------------- glass card clip

  // Closed, each glass card is clipped to a small rounded box hugging its label.
  function measureClips() {
    stage!.querySelectorAll<HTMLElement>('.hcard').forEach((card) => {
      const panel = card.querySelector<HTMLElement>('.hcard__panel');
      const label = card.querySelector<HTMLElement>('.hcard__label');
      if (!panel || !label) return;
      const c = card.getBoundingClientRect();
      const l = label.getBoundingClientRect();
      const pad = 8;
      panel.style.setProperty('--ci-t', `${Math.max(0, l.top - c.top - pad)}px`);
      panel.style.setProperty('--ci-l', `${Math.max(0, l.left - c.left - pad)}px`);
      panel.style.setProperty('--ci-r', `${Math.max(0, c.right - l.right - pad)}px`);
      panel.style.setProperty('--ci-b', `${Math.max(0, c.bottom - l.bottom - pad)}px`);
    });
  }
  new ResizeObserver(measureClips).observe(stage);

  // ---------------------------------------------------------------- review helper

  function fromHash() {
    const h = location.hash.slice(1);
    if (isOpenState(h)) { pinned = true; set(h); }
    else if (pinned) { pinned = false; set('default'); }
  }
  addEventListener('hashchange', fromHash);

  // ---------------------------------------------------------------- intro

  // Start once the type and the photo are ready, but never keep people waiting long.
  const photo = stage.querySelector<HTMLImageElement>('.photo__img');
  const assetsReady = Promise.race([
    Promise.all([
      document.fonts?.ready,
      photo?.decode().catch(() => {}),
    ]),
    new Promise((r) => setTimeout(r, 1200)),
  ]);

  let seen = false;
  try { seen = sessionStorage.getItem(INTRO_KEY) === '1'; sessionStorage.setItem(INTRO_KEY, '1'); } catch {}

  function finishIntro() {
    delete stage!.dataset.intro;
    ready = true;
    measureClips();
    fromHash();
    // If the pointer is already resting on a heading, open it now.
    if (pointer) evaluate(pointer.x, pointer.y, document.elementFromPoint(pointer.x, pointer.y));
  }

  assetsReady.then(() => {
    measureClips();
    if (seen || reducedMotion.matches || location.hash) {
      finishIntro();
    } else {
      stage.dataset.intro = 'play';
      window.setTimeout(() => { ready = true; }, INTERACTIVE_MS);
      window.setTimeout(finishIntro, INTRO_MS);
    }
  });

  // ---------------------------------------------------------------- sky

  const canvas = stage.querySelector<HTMLCanvasElement>('canvas[data-sky]');
  if (canvas && photo && !reducedMotion.matches) mountSky(canvas, photo);
}
