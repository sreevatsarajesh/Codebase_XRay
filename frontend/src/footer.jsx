
const GITHUB_URL = "https://github.com/sreevatsarajesh";
const LINKEDIN_URL = "https://www.linkedin.com/in/sreevatsa-rajesh-9118bb340/";
const EMAIL = "sreevatsarajesh@gmail.com";

function SocialIcon({ type }) {
    if (type === "github") {
        return (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.56.1.76-.24.76-.54v-2.1c-3.1.67-3.75-1.32-3.75-1.32-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.59 1.21 3.22.92.1-.72.39-1.21.7-1.49-2.47-.28-5.07-1.24-5.07-5.51 0-1.22.44-2.21 1.15-2.99-.12-.28-.5-1.42.11-2.95 0 0 .94-.3 3.05 1.14a10.6 10.6 0 0 1 5.55 0c2.11-1.44 3.05-1.14 3.05-1.14.61 1.53.23 2.67.11 2.95.72.78 1.15 1.77 1.15 2.99 0 4.28-2.6 5.23-5.08 5.5.4.35.75 1.03.75 2.08v3.07c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
            </svg>
        );
    }

    if (type === "linkedin") {
        return (
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
                <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.34H4.95V9.5h2.98v8.84ZM6.44 8.3a1.73 1.73 0 1 1 0-3.46 1.73 1.73 0 0 1 0 3.46Zm12.05 10.04h-2.98v-4.3c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.12-1.65 2.28v4.37H9.45V9.5h2.86v1.21h.04c.4-.7 1.37-1.43 2.82-1.43 3.01 0 3.32 1.98 3.32 4.56v4.5Z" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="1" />
            <path d="m3 7 9 7 9-7" />
        </svg>
    );
}

function BrandIcon() {
    return (
        <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m15.5 15.5 5 5M8 8h5M8 11h4M8 14h2" />
        </svg>
    );
}

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-main">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <BrandIcon />
                    </div>
                    <div>
                        <h3>CODEBASE X-RAY</h3>
                        <p>Understand your code. Visualize its structure.</p>
                    </div>
                </div>

                <div className="footer-about">
                    <h4>BUILT BY SREEVATSA RAJESH</h4>
                    <p>
                        Mathematics & Computing student at Manipal Institute
                        of Technology, interested in software development,
                        machine learning, and cybersecurity.
                    </p>
                </div>

                <div className="footer-links">
                    <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                        <SocialIcon type="github" />
                        <span>GitHub</span>
                    </a>
                    <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                        <SocialIcon type="linkedin" />
                        <span>LinkedIn</span>
                    </a>
                    <a href={`mailto:${EMAIL}`}>
                        <SocialIcon type="email" />
                        <span>Contact</span>
                    </a>
                </div>
            </div>

            <div className="footer-bottom">
                <span>© {new Date().getFullYear()} Sreevatsa Rajesh</span>
                <span>Licensed under MIT</span>
                <span>Built with React & FastAPI</span>
            </div>
        </footer>
    );
}
