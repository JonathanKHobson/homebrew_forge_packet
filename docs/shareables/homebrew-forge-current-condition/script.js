const progressFill = document.querySelector('.scroll-progress span');
const sections = Array.from(document.querySelectorAll('main section[id]'));
const navLinks = Array.from(document.querySelectorAll('.site-nav a'));
const revealSections = Array.from(document.querySelectorAll('.reveal-section'));
const dialog = document.querySelector('.image-dialog');
const dialogImage = dialog?.querySelector('img');
const closeDialog = dialog?.querySelector('.dialog-close');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function updateProgress() {
  if (!progressFill) return;
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function setActiveNav() {
  const current = sections
    .slice()
    .reverse()
    .find((section) => section.getBoundingClientRect().top <= 150);

  navLinks.forEach((link) => {
    link.classList.toggle('active', current ? link.getAttribute('href') === `#${current.id}` : false);
  });
}

function revealImmediately() {
  revealSections.forEach((section) => section.classList.add('is-visible'));
}

if (reduceMotion.matches || !('IntersectionObserver' in window)) {
  revealImmediately();
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealSections.forEach((section) => observer.observe(section));
}

document.addEventListener('scroll', () => {
  updateProgress();
  setActiveNav();
}, { passive: true });

document.querySelectorAll('.image-button').forEach((button) => {
  button.addEventListener('click', () => {
    if (!dialog || !dialogImage || typeof dialog.showModal !== 'function') return;
    const image = button.querySelector('img');
    dialogImage.src = button.dataset.full || image?.src || '';
    dialogImage.alt = image?.alt || 'Expanded Homebrew Forge image';
    dialog.showModal();
    closeDialog?.focus();
  });
});

closeDialog?.addEventListener('click', () => {
  dialog?.close();
});

dialog?.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

dialog?.addEventListener('cancel', () => {
  dialogImage?.removeAttribute('src');
});

document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => {
    image.dataset.loadError = 'true';
  }, { once: true });
});

updateProgress();
setActiveNav();
