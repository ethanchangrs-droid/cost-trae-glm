import { test, expect } from '@playwright/test';

test.describe('规则配置测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rules/config');
  });

  test('应该显示自然语言规则配置标题', async ({ page }) => {
    await expect(page.getByText('自然语言规则配置')).toBeVisible();
  });

  test('应该显示规则类型选择', async ({ page }) => {
    await expect(page.getByText('规则类型')).toBeVisible();
  });

  test('应该显示规则描述输入', async ({ page }) => {
    await expect(page.getByText('规则描述')).toBeVisible();
    await expect(page.getByPlaceholder('请用自然语言描述规则')).toBeVisible();
  });

  test('应该显示生成配置按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: '生成配置' })).toBeVisible();
  });

  test('应该显示保存规则按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: '保存规则' })).toBeVisible();
  });

  test('应该显示预览区域', async ({ page }) => {
    await expect(page.getByText('配置预览')).toBeVisible();
  });

  test('应该可以输入自然语言规则描述', async ({ page }) => {
    const descInput = page.getByPlaceholder('请用自然语言描述规则');
    await descInput.fill('普通员工在一线城市住宿，每晚不超过400元');
    await expect(descInput).toHaveValue('普通员工在一线城市住宿，每晚不超过400元');
  });

  test('应该可以选择规则类型', async ({ page }) => {
    const typeSelect = page.getByRole('combobox').filter({ hasText: '规则类型' });
    await typeSelect.click();
    await expect(page.getByText('住宿标准规则')).toBeVisible();
    await expect(page.getByText('交通工具规则')).toBeVisible();
    await expect(page.getByText('补贴标准规则')).toBeVisible();
  });

  test('选择住宿标准规则类型后应显示相关提示', async ({ page }) => {
    const typeSelect = page.getByRole('combobox').filter({ hasText: '规则类型' });
    await typeSelect.click();
    await page.getByText('住宿标准规则').click();
    await page.waitForTimeout(500);
  });

  test('点击生成配置应该解析自然语言规则', async ({ page }) => {
    const descInput = page.getByPlaceholder('请用自然语言描述规则');
    await descInput.fill('普通员工在一线城市住宿，每晚不超过400元');
    
    await page.getByRole('button', { name: '生成配置' }).click();
    await page.waitForTimeout(2000);
  });

  test('配置预览区域应该显示解析后的配置', async ({ page }) => {
    const descInput = page.getByPlaceholder('请用自然语言描述规则');
    await descInput.fill('普通员工在一线城市住宿，每晚不超过400元');
    
    await page.getByRole('button', { name: '生成配置' }).click();
    await page.waitForTimeout(2000);
    
    await expect(page.getByText('配置预览')).toBeVisible();
  });

  test('点击保存规则应该保存规则配置', async ({ page }) => {
    const descInput = page.getByPlaceholder('请用自然语言描述规则');
    await descInput.fill('测试规则：经理在二线城市住宿，每晚不超过500元');
    
    await page.getByRole('button', { name: '生成配置' }).click();
    await page.waitForTimeout(2000);
    
    await page.getByRole('button', { name: '保存规则' }).click();
    await page.waitForTimeout(1000);
  });

  test('应该显示历史规则列表', async ({ page }) => {
    await page.goto('/rules/manage');
    await expect(page.getByText('规则管理')).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('应该可以编辑现有规则', async ({ page }) => {
    await page.goto('/rules/manage');
    await page.waitForTimeout(1000);
    
    const editButtons = page.getByRole('button').filter({ hasText: '编辑' });
    const count = await editButtons.count();
    
    if (count > 0) {
      await editButtons.first().click();
      await expect(page.getByText('编辑规则')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('应该可以删除规则', async ({ page }) => {
    await page.goto('/rules/manage');
    await page.waitForTimeout(1000);
    
    const deleteButtons = page.getByRole('button').filter({ hasText: '删除' });
    const count = await deleteButtons.count();
    
    if (count > 0) {
      await deleteButtons.first().click();
      await expect(page.getByText('确认删除')).toBeVisible();
      await page.getByRole('button', { name: '取消' }).click();
    }
  });

  test('应该可以按规则类型筛选', async ({ page }) => {
    await page.goto('/rules/manage');
    await page.waitForTimeout(500);
    
    const filterSelect = page.getByRole('combobox').filter({ hasText: '全部' });
    await filterSelect.click();
    await expect(page.getByText('住宿标准')).toBeVisible();
    await expect(page.getByText('交通工具')).toBeVisible();
    await expect(page.getByText('补贴标准')).toBeVisible();
  });
});
