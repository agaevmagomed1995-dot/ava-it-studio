document.addEventListener('DOMContentLoaded', () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.service-card, .portfolio-item, .expect-item, .about, .pricing, .process').forEach((el, i) => {
        el.style.setProperty('--d', `${(i % 6) * 70}ms`);
        if (!reduce) el.classList.add('reveal');
        observer.observe(el);
    });

    const header = document.querySelector('.header');
    const links = [...document.querySelectorAll('.nav a')];
    const sections = links
        .map((a) => document.querySelector(a.getAttribute('href')))
        .filter(Boolean);

    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 12);
        const y = window.scrollY + 120;
        let current = sections[0];
        sections.forEach((sec) => {
            if (sec.offsetTop <= y) current = sec;
        });
        links.forEach((a) => a.classList.toggle('active', current && a.getAttribute('href') === `#${current.id}`));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const steps = [...document.querySelectorAll('.process-steps .step')];
    if (steps.length && !reduce) {
        let i = 0;
        const tick = () => {
            steps.forEach((s, n) => s.classList.toggle('is-live', n === i));
            i = (i + 1) % steps.length;
        };
        tick();
        setInterval(tick, 1600);
    }

    const visual = document.querySelector('.abstract-shape');
    const hero = document.querySelector('.hero');
    if (visual && hero && !reduce && window.matchMedia('(pointer: fine)').matches) {
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            visual.style.transform = `translate(${x * 18}px, ${y * 12}px)`;
        });
        hero.addEventListener('pointerleave', () => {
            visual.style.transform = '';
        });
    }

    document.querySelectorAll('.btn-primary, .btn-white').forEach((btn) => {
        btn.addEventListener('pointermove', (e) => {
            if (reduce) return;
            const r = btn.getBoundingClientRect();
            btn.style.setProperty('--mx', `${e.clientX - r.left}px`);
            btn.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });
});
