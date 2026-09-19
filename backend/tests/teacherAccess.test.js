const {
    getAssignedClassIds,
    getAssignedSubjectIds,
    teacherHasClass,
    teacherHasSubject,
} = require('../utils/teacherAccess');

describe('teacher attendance assignments', () => {
    const teacher = {
        teachSclass: 'class-a',
        teachSubjects: ['subject-a', 'subject-b'],
        teachSubject: 'subject-a',
    };

    test('resolves assigned class and subject ids', () => {
        expect(getAssignedClassIds(teacher)).toEqual(['class-a']);
        expect(getAssignedSubjectIds(teacher)).toEqual(['subject-a', 'subject-b']);
    });

    test('allows assigned targets and rejects unrelated targets', () => {
        expect(teacherHasClass(teacher, 'class-a')).toBe(true);
        expect(teacherHasClass(teacher, 'class-b')).toBe(false);
        expect(teacherHasSubject(teacher, 'subject-b')).toBe(true);
        expect(teacherHasSubject(teacher, 'subject-c')).toBe(false);
    });
});
