import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Setup Supabase Client for seeding data
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const TEST_USER_ID = 'local-user'; // The app currently uses local-user hardcoded for everything. 
const TEST_COMPANY_PREFIX = 'PLAYWRIGHT_TEST_COMPANY_';

test.describe('Jobs Store E2E Tests', () => {
  let seededJobIds: string[] = [];

  test.beforeAll(async () => {
    // Clean up any stray test jobs before we start
    await supabase.from('jobs').delete().like('company', `${TEST_COMPANY_PREFIX}%`);

    // Seed test jobs
    const jobsToInsert = [
      { user_id: TEST_USER_ID, company: `${TEST_COMPANY_PREFIX}1`, position: 'Frontend Engineer', status: 'saved' },
      { user_id: TEST_USER_ID, company: `${TEST_COMPANY_PREFIX}2`, position: 'Backend Engineer', status: 'applied' },
      { user_id: TEST_USER_ID, company: `${TEST_COMPANY_PREFIX}3`, position: 'Fullstack Engineer', status: 'interview' }
    ];

    const { data } = await supabase.from('jobs').insert(jobsToInsert).select();
    if (data) {
      seededJobIds = data.map((j: { id: string }) => j.id);
    }
  });

  test.afterAll(async () => {
    // Teardown test jobs
    if (seededJobIds.length > 0) {
      await supabase.from('jobs').delete().in('id', seededJobIds);
    }
    // Also cleanup any jobs added during the test that start with the prefix
    await supabase.from('jobs').delete().like('company', `${TEST_COMPANY_PREFIX}%`);
  });

  test.beforeEach(async ({ page }) => {
    // Go to the jobs page
    await page.goto('/jobs');
    // Wait for jobs to load
    await expect(page.getByText('Job Applications')).toBeVisible();
    await expect(page.getByText(`${TEST_COMPANY_PREFIX}1`)).toBeVisible();
  });

  test('Adding a new job instantly updates the UI', async ({ page }) => {
    // Click Add Job button
    await page.click('button:has-text("+ Add Job")');
    
    // Fill out the modal
    const testCompany = `${TEST_COMPANY_PREFIX}NewJob`;
    
    // The modal has text inputs. We can target them by navigating from the labels.
    await page.locator('label:has-text("Company") + div input').fill(testCompany);
    await page.locator('label:has-text("Position") + input').fill('UI/UX Designer');
    
    // Click Save
    await page.click('button:has-text("Save Job")');

    // Wait for the modal to close and the toast to appear
    await expect(page.getByText('New job application tracked!')).toBeVisible();
    
    // Verify the new job is in the table immediately
    await expect(page.getByText(testCompany)).toBeVisible();
  });

  test('Rapid inline editing correctly patches and saves data', async ({ page }) => {
    // Locate the first seeded job
    const row = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}1` });
    
    // The position cell uses an EditableText component (which renders as a div contentEditable)
    // There are multiple EditableText components in the row. The position is the first one.
    const positionCell = row.locator('div[contenteditable]').first();
    
    // Click to focus it
    await positionCell.click();
    
    // Edit it quickly
    await positionCell.fill('Lead Frontend Engineer');
    // Blur to save
    await positionCell.blur();
    
    // It should optimistically update instantly, so wait for the new text
    await expect(positionCell).toHaveText('Lead Frontend Engineer');

    // Do another rapid edit before any network request might have finished 
    // (This tests the resilience of the optimistic update)
    await positionCell.click();
    await positionCell.fill('Principal Frontend Engineer');
    await positionCell.blur();
    
    await expect(positionCell).toHaveText('Principal Frontend Engineer');

    // Verify it saved via Toast
    await expect(page.getByText('Job updated successfully.').first()).toBeVisible();
  });

  test('Edit via pencil Icon updates UI immediately', async ({ page }) => {
    const row = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}3` });
    
    // Click the edit pencil icon on the row
    await row.locator('button[title="Edit"]').click();
    
    // Wait for the modal to open and modify the position field
    await expect(page.getByText('Edit Job')).toBeVisible();
    await page.locator('label:has-text("Position") + input').fill('Staff Engineer');
    
    // Save
    await page.click('button:has-text("Save Job")');
    
    // Verify modal closed and UI immediately shows the new position in the EditableText cell
    await expect(page.getByText('Edit Job')).toBeHidden();
    const positionCell = row.locator('div[contenteditable]').first();
    await expect(positionCell).toHaveText('Staff Engineer');
    await expect(page.getByText('Job application updated!')).toBeVisible();
  });

  test('Empty job submission shows validation error', async ({ page }) => {
    // Open Add Job Modal
    await page.click('button:has-text("+ Add Job")');
    
    // Ensure company and position are empty
    await page.locator('label:has-text("Company") + div input').fill('');
    await page.locator('label:has-text("Position") + input').fill('');
    
    // Click Save
    await page.click('button:has-text("Save Job")');
    
    // Verify toast error is shown
    await expect(page.getByText('Company and Position are required fields.')).toBeVisible();
    
    // Verify modal is still open
    await expect(page.getByRole('heading', { name: 'Add Job' })).toBeVisible();
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('View Posting button only renders when Source Link URL is provided', async ({ page }) => {
    const row = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}1` });
    
    // Open edit modal
    await row.locator('button[title="Edit"]').click();
    
    // Ensure Source Link is empty, but set a Source from the dropdown
    await page.locator('label:has-text("Source Link") + input').fill('');
    await page.locator('label:has-text("Source") + select').selectOption('linked in');
    
    // Save
    await page.click('button:has-text("Save Job")');
    
    // Verify the View Posting link does not exist
    await expect(row.locator('a:has-text("View Posting")')).toBeHidden();

    // Now edit again and add a Source Link URL
    await row.locator('button[title="Edit"]').click();
    await page.locator('label:has-text("Source Link") + input').fill('https://example.com');
    await page.click('button:has-text("Save Job")');
    
    // Verify the View Posting link is now visible
    await expect(row.locator('a:has-text("View Posting")')).toBeVisible();
  });

  test('Date picker clicking same date does not erase it', async ({ page }) => {
    const row = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}2` });
    
    // The InlineDatePicker button
    const dateButton = row.locator('td').nth(5).locator('button');
    
    // Click to open calendar
    await dateButton.click();
    
    // Select a date (1st of the month, which is never > today)
    // We pick the first gridcell (td) that contains exactly '1' and isn't outside the current month
    const day1Cell = page.getByRole('gridcell').filter({ hasText: /^1$/ }).first();
    await day1Cell.click();
    
    // Wait for popover to close and ensure the date is visible (e.g. 1)
    await expect(dateButton).toContainText('1');
    const savedDateText = await dateButton.textContent();
    
    // Click it again to open calendar
    await dateButton.click();
    
    // Click the EXACT same date (it should have data-selected="true" now)
    await page.locator('[data-selected="true"]').first().click();
    
    // Verify that the date is NOT erased to "-" but remains the exact same date string
    await expect(dateButton).toHaveText(savedDateText || '');
    
    // Now verify the same edge case inside the Edit Modal
    await row.locator('button[title="Edit"]').click();
    const modalDateBtn = page.locator('label:has-text("Date Applied") + div button');
    
    await modalDateBtn.click();
    await page.locator('[data-selected="true"]').first().click();
    
    // Verify modal button still has the date
    await expect(modalDateBtn).not.toHaveText('Pick a date');
    await page.click('button:has-text("Cancel")');
  });

  test('Tailor button disabled for jobs with no description', async ({ page }) => {
    const row = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}1` });
    
    // First, clear the job description
    await row.locator('button[title="Edit"]').click();
    await page.locator('label:has-text("Job Description") + textarea').fill('');
    await page.click('button:has-text("Save Job")');
    
    // Verify the Tailor button is disabled
    const tailorBtn = row.locator('button:has-text("Tailor")');
    await expect(tailorBtn).toBeDisabled();
    
    // Add description back
    await row.locator('button[title="Edit"]').click();
    await page.locator('label:has-text("Job Description") + textarea').fill('We are looking for a Frontend Engineer with React experience.');
    await page.click('button:has-text("Save Job")');
    
    // Verify the Tailor button is enabled again
    await expect(tailorBtn).toBeEnabled();
  });

  test('Bulk deletion displays correct selection count', async ({ page }) => {
    // Find rows to delete
    const row2 = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}2` });
    const row3 = page.locator('tr').filter({ hasText: `${TEST_COMPANY_PREFIX}3` });

    // Click their checkboxes
    await row2.locator('input[type="checkbox"]').check();
    
    // Verify it says "(1)"
    await expect(page.locator('button:has-text("Delete Selected (1)")')).toBeVisible();

    await row3.locator('input[type="checkbox"]').check();
    
    // Verify it says "(2)"
    await expect(page.locator('button:has-text("Delete Selected (2)")')).toBeVisible();

    // Accept the JS confirm dialog!
    page.on('dialog', dialog => dialog.accept()); 
    await page.click('button:has-text("Delete Selected (2)")');

    // Verify they are immediately removed from the UI
    await expect(row2).toBeHidden();
    await expect(row3).toBeHidden();

    // Verify the toast appears
    await expect(page.getByText('2 job(s) deleted.')).toBeVisible();
  });
});
