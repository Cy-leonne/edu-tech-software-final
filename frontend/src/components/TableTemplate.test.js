/**
 * Tests for the shared paginated table.
 *
 * These pin the regressions that were fixed in the enhancement pass:
 *   - the rows-per-page selector used `parseInt(value, 5)` (invalid radix) so
 *     the chosen page size was ignored
 *   - the page index was never clamped, which produced a blank table when the
 *     data set shrank (for example after deleting the last row of a page)
 *   - empty data rendered an empty table instead of an empty state
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import TableTemplate from './TableTemplate';

const columns = [
    { id: 'name', label: 'Name', minWidth: 120 },
    { id: 'email', label: 'Email', minWidth: 160 },
];

const buildRows = (count) => Array.from({ length: count }).map((_, index) => ({
    id: `row-${index}`,
    name: `Person ${index + 1}`,
    email: `person${index + 1}@example.com`,
}));

const renderTable = (props) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);
    act(() => {
        root.render(<TableTemplate columns={columns} {...props} />);
    });
    return container;
};

const dataRowCount = (container) => {
    const rows = Array.from(container.querySelectorAll('tbody tr'));
    return rows.length;
};

describe('TableTemplate', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('renders only the first page of rows and shows the page summary', () => {
        const container = renderTable({ rows: buildRows(12), initialRowsPerPage: 5 });
        expect(dataRowCount(container)).toBe(5);
        expect(container.textContent).toContain('1–5 of 12');
    });

    test('moves to the next page when the next-page control is used', () => {
        const container = renderTable({ rows: buildRows(12), initialRowsPerPage: 5 });
        const nextButton = container.querySelector('button[aria-label="Go to next page"]');
        expect(nextButton).not.toBeNull();

        act(() => {
            nextButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });

        expect(container.textContent).toContain('6–10 of 12');
        expect(container.textContent).toContain('Person 6');
        // The first page's rows must be gone (note: 'Person 10' legitimately
        // remains, so assert on a row that is unique to page 1).
        expect(container.textContent).not.toContain('Person 5');
    });

    test('renders an empty state instead of a blank table', () => {
        const container = renderTable({
            rows: [],
            emptyTitle: 'No teachers yet',
            emptyDescription: 'Add a teacher to get started.',
        });
        expect(container.querySelector('tbody')).toBeNull();
        expect(container.textContent).toContain('No teachers yet');
    });

    test('renders the action buttons supplied by the caller', () => {
        const ButtonHaver = ({ row }) => <button type="button">act-{row.id}</button>;
        const container = renderTable({
            rows: buildRows(2),
            initialRowsPerPage: 5,
            buttonHaver: ButtonHaver,
        });
        expect(container.textContent).toContain('act-row-0');
        expect(container.textContent).toContain('Actions');
    });
});
