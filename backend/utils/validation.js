// Input validation utilities for all endpoints

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhoneNumber = (phone) => {
    // Accept standard phone formats: +254..., 0..., 254...
    const phoneRegex = /^(\+254|254|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
};

const validatePassword = (password) => {
    // Minimum 6 characters and at least 1 number
    if (!password || password.length < 6) {
        return { valid: false, error: 'Password must be at least 6 characters long' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, error: 'Password must contain at least one number' };
    }
    return { valid: true };
};

const validateName = (name) => {
    if (!name || name.trim().length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters long' };
    }
    if (name.length > 100) {
        return { valid: false, error: 'Name must be less than 100 characters' };
    }
    return { valid: true };
};

const validateAdmissionNumber = (admissionNo) => {
    if (!admissionNo || admissionNo.toString().trim().length === 0) {
        return { valid: false, error: 'Admission number is required' };
    }
    if (admissionNo.toString().length > 20) {
        return { valid: false, error: 'Admission number must be less than 20 characters' };
    }
    return { valid: true };
};

const validateRollNumber = (rollNum) => {
    const num = parseInt(rollNum);
    if (isNaN(num) || num <= 0) {
        return { valid: false, error: 'Roll number must be a positive number' };
    }
    if (num > 10000) {
        return { valid: false, error: 'Roll number seems invalid (too large)' };
    }
    return { valid: true };
};

const validateStudentInput = (data) => {
    const errors = [];

    // Validate name
    const nameValidation = validateName(data.name || data.studentName);
    if (!nameValidation.valid) errors.push(nameValidation.error);

    // Validate admission number only when provided
    if (data.admissionNo) {
        const admissionValidation = validateAdmissionNumber(data.admissionNo);
        if (!admissionValidation.valid) errors.push(admissionValidation.error);
    }

    // Validate roll number
    const rollValidation = validateRollNumber(data.rollNum);
    if (!rollValidation.valid) errors.push(rollValidation.error);

    // Validate class selection
    if (!data.sclassName) {
        errors.push('Class selection is required');
    }

    // Validate parent phone if provided
    if (data.parentPhone && !validatePhoneNumber(data.parentPhone)) {
        errors.push('Invalid parent phone number format');
    }

    // Validate guardian phone if provided
    if (data.guardianPhone && !validatePhoneNumber(data.guardianPhone)) {
        errors.push('Invalid guardian phone number format');
    }

    // Validate parent email if provided
    if (data.parentEmail && !validateEmail(data.parentEmail)) {
        errors.push('Invalid parent email format');
    }

    // Validate password if provided
    if (data.password) {
        const pwdValidation = validatePassword(data.password);
        if (!pwdValidation.valid) errors.push(pwdValidation.error);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateStudentUpdateInput = (data) => {
    const errors = [];
    const name = data.name || data.studentName;
    if (name !== undefined) {
        const nameValidation = validateName(name);
        if (!nameValidation.valid) errors.push(nameValidation.error);
    }

    if (data.admissionNo !== undefined) {
        const admissionValidation = validateAdmissionNumber(data.admissionNo);
        if (!admissionValidation.valid) errors.push(admissionValidation.error);
    }

    if (data.rollNum !== undefined) {
        const rollValidation = validateRollNumber(data.rollNum);
        if (!rollValidation.valid) errors.push(rollValidation.error);
    }

    if (data.sclassName !== undefined && (!data.sclassName || data.sclassName.toString().trim().length === 0)) {
        errors.push('Class selection is required');
    }

    if (data.parentPhone !== undefined && data.parentPhone && !validatePhoneNumber(data.parentPhone)) {
        errors.push('Invalid parent phone number format');
    }

    if (data.guardianPhone !== undefined && data.guardianPhone && !validatePhoneNumber(data.guardianPhone)) {
        errors.push('Invalid guardian phone number format');
    }

    if (data.parentEmail !== undefined && data.parentEmail && !validateEmail(data.parentEmail)) {
        errors.push('Invalid parent email format');
    }

    if (data.guardianEmail !== undefined && data.guardianEmail && !validateEmail(data.guardianEmail)) {
        errors.push('Invalid guardian email format');
    }

    if (data.password !== undefined && data.password) {
        const pwdValidation = validatePassword(data.password);
        if (!pwdValidation.valid) errors.push(pwdValidation.error);
    }

    if (data.email !== undefined && data.email && !validateEmail(data.email)) {
        errors.push('Invalid email format');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateTeacherInput = (data) => {
    const errors = [];

    // Validate name
    const nameValidation = validateName(data.name || data.teacherName);
    if (!nameValidation.valid) errors.push(nameValidation.error);

    // Validate email
    if (data.email && !validateEmail(data.email)) {
        errors.push('Invalid email format');
    }

    // Validate phone
    if (data.phone && !validatePhoneNumber(data.phone)) {
        errors.push('Invalid phone number format');
    }

    // Validate password if provided
    if (data.password) {
        const pwdValidation = validatePassword(data.password);
        if (!pwdValidation.valid) errors.push(pwdValidation.error);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateTeacherUpdateInput = (data) => {
    const errors = [];

    if (data.name !== undefined) {
        const nameValidation = validateName(data.name);
        if (!nameValidation.valid) errors.push(nameValidation.error);
    }

    if (data.email !== undefined && data.email && !validateEmail(data.email)) {
        errors.push('Invalid email format');
    }

    if (data.phone !== undefined && data.phone && !validatePhoneNumber(data.phone)) {
        errors.push('Invalid phone number format');
    }

    if (data.salary !== undefined && data.salary !== '' && (isNaN(Number(data.salary)) || Number(data.salary) < 0)) {
        errors.push('Salary must be a valid non-negative number');
    }

    if (data.password !== undefined && data.password) {
        const pwdValidation = validatePassword(data.password);
        if (!pwdValidation.valid) errors.push(pwdValidation.error);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateAdminInput = (data) => {
    const errors = [];

    // Validate name
    const nameValidation = validateName(data.name || data.schoolName);
    if (!nameValidation.valid) errors.push(nameValidation.error);

    // Validate email
    if (!validateEmail(data.email)) {
        errors.push('Invalid email format');
    }

    // Validate password
    const pwdValidation = validatePassword(data.password);
    if (!pwdValidation.valid) errors.push(pwdValidation.error);

    // Validate phone if provided
    if (data.phone && !validatePhoneNumber(data.phone)) {
        errors.push('Invalid phone number format');
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateAdminUpdateInput = (data) => {
    const errors = [];

    if (data.name !== undefined) {
        const nameValidation = validateName(data.name);
        if (!nameValidation.valid) errors.push(nameValidation.error);
    }

    if (data.schoolName !== undefined && (!data.schoolName || data.schoolName.toString().trim().length === 0)) {
        errors.push('School name is required');
    }

    if (data.email !== undefined && data.email && !validateEmail(data.email)) {
        errors.push('Invalid email format');
    }

    if (data.phone !== undefined && data.phone && !validatePhoneNumber(data.phone)) {
        errors.push('Invalid phone number format');
    }

    if (data.password !== undefined && data.password) {
        const pwdValidation = validatePassword(data.password);
        if (!pwdValidation.valid) errors.push(pwdValidation.error);
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    // Remove SQL injection attempts and XSS
    return input
        .trim()
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/javascript:/gi, '')
        .substring(0, 1000); // Limit length
};

const validateEmployee = (data) => {
    const errors = [];

    // Validate names
    if (data.firstName) {
        const firstNameValidation = validateName(data.firstName);
        if (!firstNameValidation.valid) errors.push('First name: ' + firstNameValidation.error);
    } else {
        errors.push('First name is required');
    }

    if (data.lastName) {
        const lastNameValidation = validateName(data.lastName);
        if (!lastNameValidation.valid) errors.push('Last name: ' + lastNameValidation.error);
    } else {
        errors.push('Last name is required');
    }

    // Validate email
    if (!data.email || !validateEmail(data.email)) {
        errors.push('Valid email is required');
    }

    // Validate phone
    if (!data.phone || !validatePhoneNumber(data.phone)) {
        errors.push('Valid phone number is required');
    }

    // Validate department
    const validDepartments = [
        'Administration', 'HR', 'Finance', 'Academic', 'Support Staff',
        'IT', 'Maintenance', 'Security', 'Transportation', 'Catering',
    ];
    if (!data.department || !validDepartments.includes(data.department)) {
        errors.push('Valid department is required');
    }

    // Validate position
    if (!data.position || data.position.trim().length === 0) {
        errors.push('Position is required');
    }

    // Validate date of joining
    if (!data.dateOfJoining) {
        errors.push('Date of joining is required');
    }

    // Validate employment type if provided
    if (data.employmentType) {
        const validTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary'];
        if (!validTypes.includes(data.employmentType)) {
            errors.push('Invalid employment type');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

const validateAttendance = (data) => {
    const errors = [];

    // Validate employee ID
    if (!data.employeeId) {
        errors.push('Employee ID is required');
    }

    // Validate status
    const validStatuses = ['Present', 'Absent', 'Late', 'Early Departure', 'Half Day', 'On Leave'];
    if (!data.status || !validStatuses.includes(data.status)) {
        errors.push('Valid status is required');
    }

    // Validate date
    if (!data.date) {
        errors.push('Date is required');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

const validateLeave = (data) => {
    const errors = [];

    // Validate employee ID
    if (!data.employeeId) {
        errors.push('Employee ID is required');
    }

    // Validate leave type
    const validLeaveTypes = [
        'Annual Leave',
        'Sick Leave',
        'Maternity Leave',
        'Paternity Leave',
        'Compassionate Leave',
        'Study Leave',
        'Unpaid Leave',
        'Other'
    ];
    if (!data.leaveType || !validLeaveTypes.includes(data.leaveType)) {
        errors.push('Valid leave type is required');
    }

    // Validate dates
    if (!data.startDate) {
        errors.push('Start date is required');
    }
    if (!data.endDate) {
        errors.push('End date is required');
    }

    if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end < start) {
            errors.push('End date must be after start date');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

module.exports = {
    validateEmail,
    validatePhoneNumber,
    validatePassword,
    validateName,
    validateAdmissionNumber,
    validateRollNumber,
    validateStudentInput,
    validateStudentUpdateInput,
    validateTeacherInput,
    validateTeacherUpdateInput,
    validateAdminInput,
    validateEmployee,
    validateAttendance,
    validateLeave,
    sanitizeInput
};