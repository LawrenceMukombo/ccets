import React from 'react';
import './Footer.css';

function Footer() {
    return (
        <footer className="app-footer">
            <p className="footer-copyright">© {new Date().getFullYear()} CCETS - Cold Chain Equipment Ticketing System</p>
            <p className="footer-dev">Developed by <a href="mailto:lawrencemukombo2@gmail.com">Lawrence Mukombo</a></p>
        </footer>
    );
}

export default Footer;
