
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Box, Button, Paper, TextField, Typography, Alert, Stack } from '@mui/material';

const API_BASE_URL = process.env.REACT_APP_BASE_URL || 'http://localhost:5000';

const TeacherCreateQuiz = () => {
    const { currentUser } = useSelector((state) => state.user);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState([
        { question: '', options: ['', '', '', ''], correctAnswer: '' },
    ]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const updateQuestion = (index, field, value) => {
        const nextQuestions = [...questions];
        nextQuestions[index][field] = value;
        setQuestions(nextQuestions);
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        const nextQuestions = [...questions];
        nextQuestions[questionIndex].options[optionIndex] = value;
        setQuestions(nextQuestions);
    };

    const addQuestion = () => {
        setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: '' }]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/Quiz`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-id': currentUser?._id || '',
                },
                body: JSON.stringify({
                    title,
                    description,
                    subject: currentUser?.teachSubject?._id,
                    classId: currentUser?.teachSclass?._id,
                    teacher: currentUser?._id,
                    school: currentUser?.school?._id || currentUser?.school,
                    questions,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Quiz created successfully.');
                setTitle('');
                setDescription('');
                setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: '' }]);
            } else {
                setMessage(data.message || 'Failed to create quiz.');
            }
        } catch (error) {
            setMessage('Network error while creating quiz.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4 }}>
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>Create Quiz</Typography>
                <form onSubmit={handleSubmit}>
                    <TextField label="Quiz Title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} required sx={{ mb: 2 }} />
                    <TextField label="Description" fullWidth multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} sx={{ mb: 3 }} />

                    {questions.map((question, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2 }} variant="outlined">
                            <Typography variant="subtitle1">Question {index + 1}</Typography>
                            <TextField
                                label="Question"
                                fullWidth
                                value={question.question}
                                onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                required
                                sx={{ mb: 2 }}
                            />
                            <Stack spacing={2}>
                                {question.options.map((option, optionIndex) => (
                                    <TextField
                                        key={optionIndex}
                                        label={`Option ${optionIndex + 1}`}
                                        fullWidth
                                        value={option}
                                        onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                        required
                                    />
                                ))}
                            </Stack>
                            <TextField
                                label="Correct Answer"
                                fullWidth
                                value={question.correctAnswer}
                                onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                                required
                                sx={{ mt: 2 }}
                            />
                        </Paper>
                    ))}

                    <Button variant="outlined" onClick={addQuestion} sx={{ mb: 2 }}>
                        Add Question
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading} fullWidth>
                        {loading ? 'Creating...' : 'Create Quiz'}
                    </Button>
                </form>
                {message && <Alert severity={message.includes('success') ? 'success' : 'error'} sx={{ mt: 2 }}>{message}</Alert>}
            </Paper>
        </Box>
    );
};

export default TeacherCreateQuiz;
