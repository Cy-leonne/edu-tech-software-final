const toId = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value._id || value.id ? String(value._id || value.id) : null;
    return String(value);
};

const getAssignedClassIds = (teacher = {}) => [
    teacher.teachSclass,
    ...(Array.isArray(teacher.teachSclasses) ? teacher.teachSclasses : []),
]
    .map(toId)
    .filter(Boolean);

const getAssignedSubjectIds = (teacher = {}) => [
    teacher.teachSubject,
    ...(Array.isArray(teacher.teachSubjects) ? teacher.teachSubjects : []),
]
    .map(toId)
    .filter((id, index, values) => id && values.indexOf(id) === index);

const teacherHasClass = (teacher, classId) =>
    getAssignedClassIds(teacher).includes(toId(classId));

const teacherHasSubject = (teacher, subjectId) =>
    getAssignedSubjectIds(teacher).includes(toId(subjectId));

module.exports = {
    getAssignedClassIds,
    getAssignedSubjectIds,
    teacherHasClass,
    teacherHasSubject,
};
