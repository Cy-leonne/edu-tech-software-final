export const calculateSubjectAttendancePercentage = (presentCount, totalSessions) => {
    if (totalSessions === 0 || presentCount === 0) {
        return 0;
    }
    const percentage = (presentCount / totalSessions) * 100;
    return percentage.toFixed(2); // Limit to two decimal places
};


export const groupAttendanceBySubject = (subjectAttendance = []) => {
    const attendanceBySubject = {};

    (Array.isArray(subjectAttendance) ? subjectAttendance : []).forEach((attendance) => {
        if (!attendance || !attendance.subName || typeof attendance.subName !== 'object') {
            return;
        }

        const subMeta = attendance.subName;
        const subName = subMeta.subName || 'Unknown Subject';
        const sessions = Number(subMeta.sessions) || 0;
        const subId = subMeta._id || null;

        if (!attendanceBySubject[subName]) {
            attendanceBySubject[subName] = {
                present: 0,
                absent: 0,
                sessions,
                allData: [],
                subId
            };
        }

        if (attendance.status === "Present") {
            attendanceBySubject[subName].present++;
        } else if (attendance.status === "Absent") {
            attendanceBySubject[subName].absent++;
        }

        attendanceBySubject[subName].allData.push({
            date: attendance.date,
            status: attendance.status,
        });
    });
    return attendanceBySubject;
}

export const calculateOverallAttendancePercentage = (subjectAttendance = []) => {
    let totalSessionsSum = 0;
    let presentCountSum = 0;
    const uniqueSubIds = [];

    (Array.isArray(subjectAttendance) ? subjectAttendance : []).forEach((attendance) => {
        if (!attendance || !attendance.subName || typeof attendance.subName !== 'object') {
            return;
        }

        const subMeta = attendance.subName;
        const subId = subMeta._id || null;

        if (subId && !uniqueSubIds.includes(subId)) {
            const sessions = Number(subMeta.sessions) || 0;
            totalSessionsSum += sessions;
            uniqueSubIds.push(subId);
        }

        presentCountSum += attendance.status === "Present" ? 1 : 0;
    });

    if (totalSessionsSum === 0 || presentCountSum === 0) {
        return 0;
    }

    return (presentCountSum / totalSessionsSum) * 100;
};