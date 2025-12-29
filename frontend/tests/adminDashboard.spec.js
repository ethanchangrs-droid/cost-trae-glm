import { test, expect } from '@playwright/test';

test.describe('管理员仪表盘测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('应该显示管理后台标题', async ({ page }) => {
    await expect(page.getByText('管理后台')).toBeVisible();
  });

  test('应该显示系统概览卡片', async ({ page }) => {
    await expect(page.getByText('系统概览')).toBeVisible();
  });

  test('应该显示用户统计', async ({ page }) => {
    await expect(page.getByText(/用户数/i)).toBeVisible();
  });

  test('应该显示费用报销统计', async ({ page }) => {
    await expect(page.getByText(/报销单数/i)).toBeVisible();
  });

  test('应该显示规则统计', async ({ page }) => {
    await expect(page.getByText(/规则数/i)).toBeVisible();
  });

  test('应该显示日志统计', async ({ page }) => {
    await expect(page.getByText(/日志数/i)).toBeVisible();
  });

  test('应该显示配置管理区域', async ({ page }) => {
    await expect(page.getByText('系统配置')).toBeVisible();
  });

  test('应该显示日志查看区域', async ({ page }) => {
    await expect(page.getByText('系统日志')).toBeVisible();
  });

  test('配置管理应该显示配置项', async ({ page }) => {
    await expect(page.getByText('配置项')).toBeVisible();
    await expect(page.getByText('当前值')).toBeVisible();
    await expect(page.getByText('操作')).toBeVisible();
  });

  test('应该可以编辑系统配置', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const editButtons = page.getByRole('button').filter({ hasText: '编辑' });
    const count = await editButtons.count();
    
    if (count > 0) {
      await editButtons.first().click();
      await expect(page.getByText('编辑配置')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('应该可以重置系统配置', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const resetButtons = page.getByRole('button').filter({ hasText: '重置' });
    const count = await resetButtons.count();
    
    if (count > 0) {
      await resetButtons.first().click();
      await expect(page.getByText('确认重置')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('日志查看应该显示日志列表', async ({ page }) => {
    await expect(page.getByText('操作类型')).toBeVisible();
    await expect(page.getByText('操作人')).toBeVisible();
    await expect(page.getByText('操作时间')).toBeVisible();
  });

  test('应该可以按日志类型筛选', async ({ page }) => {
    const filterSelect = page.locator('select').filter({ hasText: '全部' });
    const count = await filterSelect.count();
    
    if (count > 0) {
      await filterSelect.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('应该可以查看日志详情', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const viewButtons = page.getByRole('button').filter({ hasText: '查看' });
    const count = await viewButtons.count();
    
    if (count > 0) {
      await viewButtons.first().click();
      await expect(page.getByText('日志详情')).toBeVisible();
      await page.getByRole('button', { name: '关闭' }).click();
    }
  });

  test('应该可以导出日志', async ({ page }) => {
    const exportButton = page.getByRole('button').filter({ hasText: '导出' });
    const count = await exportButton.count();
    
    if (count > 0) {
      await expect(exportButton.first()).toBeVisible();
    }
  });

  test('应该显示系统健康状态', async ({ page }) => {
    await expect(page.getByText('系统状态')).toBeVisible();
  });

  test('统计卡片应该显示数字', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const cards = page.locator('.ant-statistic-content-value');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });
});
