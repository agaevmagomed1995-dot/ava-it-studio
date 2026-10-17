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

    const form = document.getElementById('request-form');
    if (!form) return;

    const formSteps = [...form.querySelectorAll('.form-step')];
    const dots = [...form.querySelectorAll('.form-progress span')];
    const success = form.querySelector('.form-success');
    let step = 1;

    const show = (n) => {
        step = n;
        formSteps.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.step) === n));
        dots.forEach((dot) => dot.classList.toggle('is-on', Number(dot.dataset.dot) <= n));
        form.querySelector(`[data-error="${n}"]`).textContent = '';
    };

    const fail = (n, message) => {
        form.querySelector(`[data-error="${n}"]`).textContent = message;
    };

    form.querySelectorAll('[data-next]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (step === 1) {
                const picked = form.querySelectorAll('input[name="service"]:checked').length;
                const details = form.details.value.trim();
                if (!picked) return fail(1, 'Choose at least one service.');
                if (details.length < 12) return fail(1, 'Add a short description — a sentence is enough.');
            }
            if (step === 2) {
                if (!form.timeline.value) return fail(2, 'Select a timeline.');
            }
            show(step + 1);
        });
    });

    form.querySelectorAll('[data-back]').forEach((btn) => {
        btn.addEventListener('click', () => show(step - 1));
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (form._honey.value) return;
        if (!form.name.value.trim() || !form.email.value.trim()) {
            return fail(3, 'Name and email are required.');
        }
        if (!form.email.checkValidity()) return fail(3, 'Enter a valid email.');

        const services = [...form.querySelectorAll('input[name="service"]:checked')].map((el) => el.value);
        const payload = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            company: form.company.value.trim(),
            phone: form.phone.value.trim(),
            contact: form.contact.value,
            timeline: form.timeline.value,
            website: form.website.value.trim(),
            services: services.join(', '),
            message: form.details.value.trim(),
            _subject: `AVA project request — ${form.name.value.trim()}`,
            _template: 'table',
            _captcha: 'false',
        };

        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        submit.textContent = 'Sending…';
        fail(3, '');

        const body = [
            `Services: ${payload.services}`,
            `Timeline: ${payload.timeline}`,
            `Website: ${payload.website || '—'}`,
            `Company: ${payload.company || '—'}`,
            `Phone: ${payload.phone || '—'}`,
            `Preferred contact: ${payload.contact}`,
            '',
            payload.message,
        ].join('\n');

        let sent = false;
        try {
            const res = await fetch('https://formsubmit.co/ajax/hello@ava-it.studio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            sent = res.ok;
        } catch (_) {
            sent = false;
        }

        if (!sent) {
            const mailto = `mailto:hello@ava-it.studio?subject=${encodeURIComponent(payload._subject)}&body=${encodeURIComponent(body)}`;
            window.location.href = mailto;
        }

        formSteps.forEach((el) => el.classList.remove('is-active'));
        form.querySelector('.form-progress').hidden = true;
        success.hidden = false;
        submit.disabled = false;
        submit.textContent = 'Send request →';
    });

    form.querySelector('[data-reset]').addEventListener('click', () => {
        form.reset();
        success.hidden = true;
        form.querySelector('.form-progress').hidden = false;
        show(1);
    });
});

