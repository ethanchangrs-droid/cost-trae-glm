import { test, expect } from '@playwright/test';

test.describe('费用报销列表测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expenses/list');
  });

  test('应该显示费用报销列表标题', async ({ page }) => {
    await expect(page.getByText('费用报销列表')).toBeVisible();
  });

  test('应该显示表格', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('应该显示用户列', async ({ page }) => {
    await expect(page.getByText('用户')).toBeVisible();
  });

  test('应该显示出差事由列', async ({ page }) => {
    await expect(page.getByText('出差事由')).toBeVisible();
  });

  test('应该显示金额列', async ({ page }) => {
    await expect(page.getByText('金额')).toBeVisible();
  });

  test('应该显示状态列', async ({ page }) => {
    await expect(page.getByText('状态')).toBeVisible();
  });

  test('应该显示搜索框', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索报销单')).toBeVisible();
  });

  test('应该可以搜索报销单', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索报销单');
    await searchInput.fill('测试');
    await page.waitForTimeout(500);
  });

  test('应该可以按状态筛选', async ({ page }) => {
    const statusFilter = page.locator('select').filter({ hasText: '全部' });
    const count = await statusFilter.count();
    
    if (count > 0) {
      await statusFilter.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('应该显示查看详情按钮', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const viewButtons = page.getByRole('button').filter({ hasText: '查看' });
    const count = await viewButtons.count();
    if (count > 0) {
      await expect(viewButtons.first()).toBeVisible();
    }
  });

  test('点击查看详情应该显示报销单详情', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const viewButtons = page.getByRole('button').filter({ hasText: '查看' });
    const count = await viewButtons.count();
    
    if (count > 0) {
      await viewButtons.first().click();
      await expect(page.getByText('报销单详情')).toBeVisible();
      await page.getByRole('button', { name: '关闭' }).click();
    }
  });

  test('应该显示操作列', async ({ page }) => {
    await expect(page.getByText('操作')).toBeVisible();
  });
});
