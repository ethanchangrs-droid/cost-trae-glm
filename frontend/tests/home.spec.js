import { test, expect } from '@playwright/test';

test.describe('首页测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('应该显示系统标题和欢迎信息', async ({ page }) => {
    await expect(page.getByText('费用报销系统')).toBeVisible();
    await expect(page.getByText(/欢迎使用费用报销系统/i)).toBeVisible();
  });

  test('应该显示功能菜单卡片', async ({ page }) => {
    await expect(page.getByText('费用报销')).toBeVisible();
    await expect(page.getByText('用户管理')).toBeVisible();
    await expect(page.getByText('规则配置')).toBeVisible();
    await expect(page.getByText('管理后台')).toBeVisible();
  });

  test('点击费用报销卡片应该导航到费用报销表单', async ({ page }) => {
    const expenseCard = page.getByText('费用报销').locator('..');
    await expenseCard.click();
    await expect(page).toHaveURL('/expenses');
    await expect(page.getByText('费用报销表单')).toBeVisible();
  });

  test('点击用户管理卡片应该导航到用户列表', async ({ page }) => {
    const userCard = page.getByText('用户管理').locator('..');
    await userCard.click();
    await expect(page).toHaveURL('/users');
    await expect(page.getByText('用户管理')).toBeVisible();
  });

  test('点击规则配置卡片应该导航到规则配置', async ({ page }) => {
    const ruleCard = page.getByText('规则配置').locator('..');
    await ruleCard.click();
    await expect(page).toHaveURL('/rules/config');
    await expect(page.getByText('自然语言规则配置')).toBeVisible();
  });

  test('点击管理后台卡片应该导航到管理员仪表盘', async ({ page }) => {
    const adminCard = page.getByText('管理后台').locator('..');
    await adminCard.click();
    await expect(page).toHaveURL('/admin');
    await expect(page.getByText('管理后台')).toBeVisible();
  });
});
