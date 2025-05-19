#!/bin/bash

# 一键同步到GitHub的脚本
# 作者：智能助手
# 日期：2023年5月

# 显示彩色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}=== 汤仔智能体聚合平台 - GitHub一键同步工具 ===${NC}"
echo -e "${YELLOW}开始同步过程...${NC}"

# 1. 获取当前状态
echo -e "${BLUE}[步骤1]${NC} 检查文件变更..."
git status

# 2. 添加所有变更
echo -e "${BLUE}[步骤2]${NC} 添加所有变更文件..."
git add .
echo -e "${GREEN}✓ 已添加所有变更${NC}"

# 3. 询问提交信息
echo -e "${YELLOW}请输入提交信息(例如：更新智能体配置):${NC}"
read commit_message

# 如果用户没有输入提交信息，使用默认信息
if [ -z "$commit_message" ]; then
  commit_message="更新网站文件 - $(date "+%Y-%m-%d %H:%M")"
  echo -e "${YELLOW}使用默认提交信息: ${commit_message}${NC}"
fi

# 4. 提交变更
echo -e "${BLUE}[步骤3]${NC} 提交变更..."
git commit -m "$commit_message"
echo -e "${GREEN}✓ 提交完成${NC}"

# 5. 推送到GitHub
echo -e "${BLUE}[步骤4]${NC} 推送到GitHub..."
git push origin main
push_result=$?

# 6. 显示结果
if [ $push_result -eq 0 ]; then
  echo -e "${GREEN}✓ 成功！你的代码已同步到GitHub${NC}"
  echo -e "${GREEN}远程仓库: https://github.com/davidwuwu001/agents-platform${NC}"
else
  echo -e "${YELLOW}⚠ 推送过程出现问题，请检查错误信息${NC}"
fi

echo -e "${BLUE}==== 同步过程完成 ====${NC}" 