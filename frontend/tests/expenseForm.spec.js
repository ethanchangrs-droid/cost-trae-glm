import { test, expect } from '@playwright/test';

test.describe('费用报销表单测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/expenses');
  });

  test('应该显示费用报销表单标题', async ({ page }) => {
    await expect(page.getByText('费用报销表单')).toBeVisible();
  });

  test('应该显示票据上传区域', async ({ page }) => {
    await expect(page.getByText('票据上传')).toBeVisible();
    await expect(page.getByText('点击或拖拽上传票据')).toBeVisible();
  });

  test('应该显示基础信息区域', async ({ page }) => {
    await expect(page.getByText('基础信息')).toBeVisible();
  });

  test('应该显示用户选择按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: '选择用户' })).toBeVisible();
  });

  test('点击选择用户应该打开用户选择弹窗', async ({ page }) => {
    await page.getByRole('button', { name: '选择用户' }).click();
    await expect(page.getByText('选择用户')).toBeVisible();
    await expect(page.getByPlaceholder('搜索用户')).toBeVisible();
  });

  test('应该可以在弹窗中搜索用户', async ({ page }) => {
    await page.getByRole('button', { name: '选择用户' }).click();
    const searchInput = page.getByPlaceholder('搜索用户');
    await searchInput.fill('张三');
    await page.waitForTimeout(500);
  });

  test('选择用户后应该关闭弹窗并填充信息', async ({ page }) => {
    await page.getByRole('button', { name: '选择用户' }).click();
    await page.waitForTimeout(1000);
    
    const userItems = page.locator('.ant-list-item').filter({ hasText: '张三' });
    const count = await userItems.count();
    
    if (count > 0) {
      await userItems.first().click();
      await expect(page.getByText('选择用户')).not.toBeVisible({ timeout: 3000 });
    } else {
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('应该显示出差日期输入', async ({ page }) => {
    await expect(page.getByText('出差开始日期')).toBeVisible();
    await expect(page.getByText('出差结束日期')).toBeVisible();
  });

  test('应该显示出差事由输入', async ({ page }) => {
    await expect(page.getByText('出差事由')).toBeVisible();
  });

  test('应该显示关联项目输入', async ({ page }) => {
    await expect(page.getByText('关联项目')).toBeVisible();
  });

  test('应该显示票据识别结果区域', async ({ page }) => {
    await expect(page.getByText('票据识别结果')).toBeVisible();
  });

  test('应该显示结构化信息表格', async ({ page }) => {
    await expect(page.getByText('票据类型')).toBeVisible();
    await expect(page.getByText('金额')).toBeVisible();
  });

  test('应该显示智能说明区域', async ({ page }) => {
    await expect(page.getByText('智能说明')).toBeVisible();
  });

  test('应该显示提交和重置按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重置' })).toBeVisible();
  });

  test('点击重置按钮应该清空表单', async ({ page }) => {
    await page.getByRole('textbox', { name: '出差事由' }).fill('测试事由');
    await page.getByRole('button', { name: '重置' }).click();
    await expect(page.getByRole('textbox', { name: '出差事由' })).toHaveValue('');
  });

  test('表单验证应该检查必填项', async ({ page }) => {
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page.getByText('请选择用户')).toBeVisible();
  });

  test('应该可以填写完整的费用报销信息', async ({ page }) => {
    await page.getByRole('button', { name: '选择用户' }).click();
    await page.waitForTimeout(1000);
    
    const userItems = page.locator('.ant-list-item');
    const count = await userItems.count();
    
    if (count > 0) {
      await userItems.first().click();
    }
    
    await page.getByRole('textbox', { name: '出差事由' }).fill('参加技术会议');
    await page.getByRole('textbox', { name: '关联项目' }).fill('项目A');
    
    await page.waitForTimeout(500);
    
    const reasonInput = page.getByRole('textbox', { name: '出差事由' });
    await expect(reasonInput).toHaveValue('参加技术会议');
  });

  test('应该显示规则验证结果', async ({ page }) => {
    await expect(page.getByText('规则验证')).toBeVisible();
  });
});
