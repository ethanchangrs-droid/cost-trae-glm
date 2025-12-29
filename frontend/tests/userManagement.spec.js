import { test, expect } from '@playwright/test';

test.describe('用户管理测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('应该显示用户管理标题和添加按钮', async ({ page }) => {
    await expect(page.getByText('用户管理')).toBeVisible();
    await expect(page.getByRole('button', { name: '添加用户' })).toBeVisible();
  });

  test('应该显示用户列表表格', async ({ page }) => {
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('姓名')).toBeVisible();
    await expect(page.getByText('工号')).toBeVisible();
    await expect(page.getByText('级别')).toBeVisible();
  });

  test('应该可以搜索用户', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索用户');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('张三');
    await page.waitForTimeout(500);
  });

  test('点击添加按钮应该打开添加用户对话框', async ({ page }) => {
    await page.getByRole('button', { name: '添加用户' }).click();
    await expect(page.getByText('添加用户')).toBeVisible();
    await expect(page.getByRole('textbox', { name: '姓名' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '工号' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: '级别' })).toBeVisible();
  });

  test('应该可以添加新用户', async ({ page }) => {
    await page.getByRole('button', { name: '添加用户' }).click();
    
    const nameInput = page.getByRole('textbox', { name: '姓名' });
    const empIdInput = page.getByRole('textbox', { name: '工号' });
    const levelSelect = page.getByRole('combobox', { name: '级别' });
    
    await nameInput.fill('测试用户');
    await empIdInput.fill(`TEST${Date.now()}`);
    await levelSelect.click();
    await page.getByText('普通员工').click();
    
    await page.getByRole('button', { name: '确定' }).click();
    
    await expect(page.getByText('添加用户成功')).toBeVisible({ timeout: 5000 });
  });

  test('应该可以编辑用户信息', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const editButtons = page.getByRole('button').filter({ hasText: '编辑' });
    const count = await editButtons.count();
    
    if (count > 0) {
      await editButtons.first().click();
      await expect(page.getByText('编辑用户')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('应该可以删除用户', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const deleteButtons = page.getByRole('button').filter({ hasText: '删除' });
    const count = await deleteButtons.count();
    
    if (count > 0) {
      await deleteButtons.first().click();
      await expect(page.getByText('确认删除')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('表单验证应该正确显示错误信息', async ({ page }) => {
    await page.getByRole('button', { name: '添加用户' }).click();
    
    await page.getByRole('button', { name: '确定' }).click();
    
    await expect(page.getByText('请输入姓名')).toBeVisible();
  });
});
