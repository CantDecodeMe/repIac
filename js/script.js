const sections = [...document.querySelectorAll('main > section[id]')];
const navLinks = [...document.querySelectorAll('.main-nav a')];

const observer = new IntersectionObserver((entries) => {
  const visibleSection = entries.find((entry) => entry.isIntersecting);
  if (!visibleSection) return;

  navLinks.forEach((link) => {
    const isCurrent = link.getAttribute('href') === `#${visibleSection.target.id}`;
    link.classList.toggle('is-active', isCurrent);
  });
}, { rootMargin: '-30% 0px -60% 0px' });

sections.forEach((section) => observer.observe(section));
