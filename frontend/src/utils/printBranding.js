const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const normalizeText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (Array.isArray(value)) return value.filter(Boolean).join(', ');
    if (typeof value === 'object') {
        const parts = [value.street, value.city, value.state, value.zipCode, value.country].filter(Boolean);
        return parts.join(', ');
    }
    return String(value).trim();
};

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const resolveSchoolAssetUrl = (url = '') => {
    if (!url) return '';
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const getSchoolBranding = (user, school = null) => {
    const branding = user?.settings?.branding || {};
    const profile = user?.settings?.schoolProfile || {};
    const schoolData = school || user?.school || {};
    return {
        name: normalizeText(branding.schoolName || schoolData.schoolName || schoolData.name || user?.schoolName || 'School'),
        tagline: normalizeText(branding.schoolTagline || schoolData.schoolTagline || user?.schoolTagline || ''),
        logo: resolveSchoolAssetUrl(branding.schoolLogo || schoolData.schoolLogo || schoolData.logo || user?.schoolLogo || ''),
        address: normalizeText(profile.address || schoolData.address || schoolData.schoolAddress || user?.schoolAddress || ''),
        phone: normalizeText(profile.phone || schoolData.phone || user?.schoolPhone || user?.phone || ''),
        email: normalizeText(profile.email || schoolData.email || user?.schoolEmail || user?.email || ''),
        website: normalizeText(profile.website || schoolData.website || user?.schoolWebsite || user?.website || ''),
    };
};

export const buildPrintBrandingHtml = (user, school = null) => {
    const branding = getSchoolBranding(user, school);
    return `
        <div class="school-print-branding">
            ${branding.logo ? `<img src="${escapeHtml(branding.logo)}" alt="${escapeHtml(branding.name)} logo" />` : ''}
            <h1>${escapeHtml(branding.name)}</h1>
            ${branding.tagline ? `<p>${escapeHtml(branding.tagline)}</p>` : ''}
            ${branding.address ? `<p>${escapeHtml(branding.address)}</p>` : ''}
            ${branding.phone ? `<p>Phone: ${escapeHtml(branding.phone)}</p>` : ''}
            ${branding.email ? `<p>Email: ${escapeHtml(branding.email)}</p>` : ''}
            ${branding.website ? `<p>Website: ${escapeHtml(branding.website)}</p>` : ''}
        </div>
    `;
};

export const printBrandingStyles = `
    .school-print-branding { text-align: center; margin: 0 auto 20px; }
    .school-print-branding img { display: block; max-width: 140px; max-height: 90px; object-fit: contain; margin: 0 auto 8px; }
    .school-print-branding h1 { margin: 0; font-size: 25px; }
    .school-print-branding p { margin: 4px 0; color: #4b5563; }
`;