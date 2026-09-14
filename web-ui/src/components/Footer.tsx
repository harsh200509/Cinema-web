import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer style={{ marginTop: '4rem', padding: '2rem 1rem', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Built by Harsh</p>
    </footer>
  );
};

export default Footer;
