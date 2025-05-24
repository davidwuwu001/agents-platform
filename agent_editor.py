#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import os
import tkinter as tk
from tkinter import ttk, scrolledtext, messagebox, filedialog
import datetime
import shutil
import configparser  # 添加configparser用于保存GitHub配置

class AgentEditor:
    def __init__(self, root):
        self.root = root
        self.root.title("智能体编辑器")
        self.root.geometry("900x700")
        
        # 设置样式
        self.style = ttk.Style()
        self.style.configure("TButton", padding=6, relief="flat", background="#ccc")
        
        # 智能体列表
        self.agents = []
        self.current_agent_index = None
        
        # 创建备份目录
        self.backup_dir = 'backups'
        if not os.path.exists(self.backup_dir):
            os.makedirs(self.backup_dir)
        
        # 创建配置目录
        self.config_dir = 'config'
        if not os.path.exists(self.config_dir):
            os.makedirs(self.config_dir)
            
        # 加载GitHub配置
        self.github_config = self.load_github_config()
            
        # 清理过期备份
        self.clean_old_backups()
        
        # 创建UI
        self.create_ui()
        
        # 加载agents.json
        self.load_agents()
    
    def load_github_config(self):
        """加载GitHub配置信息"""
        config = {
            'owner': '',
            'repo': '',
            'branch': 'main',
            'file_path': 'agents.json'
        }
        
        config_file = os.path.join(self.config_dir, 'github_config.ini')
        if os.path.exists(config_file):
            parser = configparser.ConfigParser()
            parser.read(config_file)
            if 'GitHub' in parser:
                for key in config:
                    if key in parser['GitHub']:
                        config[key] = parser['GitHub'][key]
        
        return config
    
    def save_github_config(self):
        """保存GitHub配置信息"""
        config_file = os.path.join(self.config_dir, 'github_config.ini')
        parser = configparser.ConfigParser()
        parser['GitHub'] = self.github_config
        
        with open(config_file, 'w') as f:
            parser.write(f)
        
        messagebox.showinfo("成功", "GitHub配置已保存")
    
    def create_ui(self):
        # 主框架
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 左侧智能体列表
        left_frame = ttk.Frame(main_frame, padding="5", width=200)
        left_frame.pack(side=tk.LEFT, fill=tk.Y, expand=False)
        
        ttk.Label(left_frame, text="智能体列表").pack(anchor="w", pady=(0, 5))
        
        # 添加滚动条
        list_scroll = ttk.Scrollbar(left_frame)
        list_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.agent_listbox = tk.Listbox(left_frame, yscrollcommand=list_scroll.set, width=25, height=20)
        self.agent_listbox.pack(fill=tk.BOTH, expand=True)
        list_scroll.config(command=self.agent_listbox.yview)
        
        # 左侧按钮框架
        left_buttons = ttk.Frame(left_frame)
        left_buttons.pack(fill=tk.X, expand=True, pady=5)
        
        ttk.Button(left_buttons, text="新建", command=self.new_agent).pack(side=tk.LEFT, padx=2)
        ttk.Button(left_buttons, text="删除", command=self.delete_agent).pack(side=tk.LEFT, padx=2)
        ttk.Button(left_buttons, text="复制", command=self.duplicate_agent).pack(side=tk.LEFT, padx=2)
        
        # 右侧编辑区域
        right_frame = ttk.Frame(main_frame, padding="5")
        right_frame.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True)
        
        # 表单框架
        form_frame = ttk.Frame(right_frame)
        form_frame.pack(fill=tk.BOTH, expand=True)
        
        # 创建编辑字段
        self.create_form_field(form_frame, "智能体ID:", "id_entry", 0)
        self.create_form_field(form_frame, "名称:", "name_entry", 1)
        self.create_form_field(form_frame, "API密钥 (完整密钥值):", "api_key_entry", 2)
        self.create_form_field(form_frame, "API地址:", "api_url_entry", 3)
        self.create_form_field(form_frame, "模型:", "model_entry", 4)
        
        # 温度和最大令牌数
        temp_frame = ttk.Frame(form_frame)
        temp_frame.grid(row=5, column=0, columnspan=2, sticky="w", pady=5)
        
        ttk.Label(temp_frame, text="温度:").pack(side=tk.LEFT)
        self.temp_entry = ttk.Entry(temp_frame, width=5)
        self.temp_entry.pack(side=tk.LEFT, padx=(5, 20))
        
        ttk.Label(temp_frame, text="最大Tokens:").pack(side=tk.LEFT)
        self.tokens_entry = ttk.Entry(temp_frame, width=8)
        self.tokens_entry.pack(side=tk.LEFT, padx=5)
        
        # 系统提示词 (大文本区域)
        ttk.Label(form_frame, text="系统提示词:").grid(row=6, column=0, sticky="nw", pady=5)
        self.prompt_text = scrolledtext.ScrolledText(form_frame, width=70, height=10, wrap=tk.WORD)
        self.prompt_text.grid(row=6, column=1, sticky="nsew", pady=5)
        
        # 欢迎消息
        ttk.Label(form_frame, text="欢迎消息:").grid(row=7, column=0, sticky="nw", pady=5)
        self.welcome_text = scrolledtext.ScrolledText(form_frame, width=70, height=3, wrap=tk.WORD)
        self.welcome_text.grid(row=7, column=1, sticky="nsew", pady=5)
        
        # 底部按钮
        button_frame = ttk.Frame(right_frame)
        button_frame.pack(fill=tk.X, pady=10)
        
        ttk.Button(button_frame, text="保存当前智能体", command=self.save_current_agent).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="保存所有到agents.json", command=self.save_all_agents).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="导出到...", command=self.export_agents).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="导入...", command=self.import_agents).pack(side=tk.LEFT, padx=5)
        
        # 添加备份和恢复按钮
        backup_frame = ttk.Frame(right_frame)
        backup_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(backup_frame, text="创建备份", command=self.create_backup).pack(side=tk.LEFT, padx=5)
        ttk.Button(backup_frame, text="恢复备份", command=self.restore_backup).pack(side=tk.LEFT, padx=5)
        ttk.Button(backup_frame, text="管理备份", command=self.manage_backups).pack(side=tk.LEFT, padx=5)
        
        # 添加GitHub同步按钮和设置按钮
        github_frame = ttk.Frame(right_frame)
        github_frame.pack(fill=tk.X, pady=5)
        
        ttk.Button(github_frame, text="同步到GitHub", command=self.sync_to_github).pack(side=tk.LEFT, padx=5)
        ttk.Button(github_frame, text="GitHub设置", command=self.show_github_settings).pack(side=tk.LEFT, padx=5)
        
        # 设置权重，使得文本区域可以扩展
        form_frame.columnconfigure(1, weight=1)
        form_frame.rowconfigure(6, weight=1)
        form_frame.rowconfigure(7, weight=1)
        
        # 绑定列表选择事件
        self.agent_listbox.bind('<<ListboxSelect>>', self.on_agent_select)
    
    def create_form_field(self, parent, label_text, entry_name, row):
        ttk.Label(parent, text=label_text).grid(row=row, column=0, sticky="w", pady=5)
        entry = ttk.Entry(parent, width=50)
        entry.grid(row=row, column=1, sticky="ew", pady=5)
        setattr(self, entry_name, entry)
    
    def load_agents(self):
        try:
            if os.path.exists('agents.json'):
                # 检查文件是否为空
                if os.path.getsize('agents.json') == 0:
                    messagebox.showinfo("提示", "agents.json文件为空，将创建新文件")
                    self.agents = []
                else:
                    # 尝试加载文件
                    try:
                        with open('agents.json', 'r', encoding='utf-8') as f:
                            self.agents = json.load(f)
                            
                        # 更新列表框
                        self.update_agent_listbox()
                        
                        # 如果有智能体，默认选择第一个
                        if self.agents:
                            self.agent_listbox.selection_set(0)
                            self.on_agent_select(None)
                        
                        # 检查API密钥
                        self.check_api_keys_on_load()
                            
                        messagebox.showinfo("成功", f"已加载 {len(self.agents)} 个智能体")
                    except json.JSONDecodeError as json_err:
                        # JSON解析错误，创建备份并重置
                        error_file = f"agents_error_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                        backup_path = os.path.join(self.backup_dir, error_file)
                        
                        # 备份出错的文件
                        shutil.copy2('agents.json', backup_path)
                        
                        messagebox.showwarning(
                            "警告", 
                            f"agents.json文件格式错误: {str(json_err)}\n"
                            f"已将问题文件备份到 {error_file}\n"
                            f"将创建新的空文件。"
                        )
                        
                        # 创建新的空数组
                        self.agents = []
                        
                        # 立即保存一个有效的JSON文件
                        with open('agents.json', 'w', encoding='utf-8') as f:
                            json.dump(self.agents, f, ensure_ascii=False, indent=2)
            else:
                messagebox.showinfo("提示", "未找到agents.json文件，将创建新文件")
                self.agents = []
                
                # 立即创建空文件
                with open('agents.json', 'w', encoding='utf-8') as f:
                    json.dump(self.agents, f, ensure_ascii=False, indent=2)
                
        except Exception as e:
            messagebox.showerror("错误", f"加载agents.json失败: {str(e)}")
            # 确保agents被初始化为空列表，防止后续错误
            self.agents = []
    
    def update_agent_listbox(self):
        self.agent_listbox.delete(0, tk.END)
        for agent in self.agents:
            name = agent.get('name', 'Unnamed Agent')
            self.agent_listbox.insert(tk.END, name)
    
    def on_agent_select(self, event):
        selected_indices = self.agent_listbox.curselection()
        if selected_indices:
            index = selected_indices[0]
            if 0 <= index < len(self.agents):
                # 更新当前索引
                self.current_agent_index = index
                agent = self.agents[index]
                
                # 填充表单
                self.id_entry.delete(0, tk.END)
                self.id_entry.insert(0, agent.get('id', ''))
                
                self.name_entry.delete(0, tk.END)
                self.name_entry.insert(0, agent.get('name', ''))
                
                self.api_key_entry.delete(0, tk.END)
                self.api_key_entry.insert(0, agent.get('apiKeyVariableName', ''))
                
                self.api_url_entry.delete(0, tk.END)
                self.api_url_entry.insert(0, agent.get('apiUrl', ''))
                
                self.model_entry.delete(0, tk.END)
                self.model_entry.insert(0, agent.get('model', ''))
                
                self.temp_entry.delete(0, tk.END)
                self.temp_entry.insert(0, agent.get('temperature', 0.7))
                
                self.tokens_entry.delete(0, tk.END)
                self.tokens_entry.insert(0, agent.get('max_tokens', 2048))
                
                self.prompt_text.delete(1.0, tk.END)
                self.prompt_text.insert(tk.END, agent.get('systemPrompt', ''))
                
                self.welcome_text.delete(1.0, tk.END)
                self.welcome_text.insert(tk.END, agent.get('welcomeMessage', ''))
    
    def get_form_data(self):
        agent_id = self.id_entry.get().strip()
        name = self.name_entry.get().strip()
        api_key = self.api_key_entry.get().strip()
        
        if not agent_id:
            messagebox.showerror("错误", "智能体ID不能为空")
            return None
        
        if not name:
            messagebox.showerror("错误", "智能体名称不能为空")
            return None
        
        # 验证 API 密钥
        is_valid, error_msg = self.validate_api_key(api_key)
        if not is_valid:
            result = messagebox.askyesnocancel(
                "API密钥警告", 
                f"{error_msg}\n\n是否仍要继续保存？\n点击'是'继续保存，'否'返回修改，'取消'放弃操作。"
            )
            if result is None:  # 取消
                return None
            elif result is False:  # 否，返回修改
                return None
            # 如果选择'是'，继续执行保存
        
        try:
            temperature = float(self.temp_entry.get().strip())
        except ValueError:
            messagebox.showerror("错误", "温度必须是有效的数字")
            return None
        
        try:
            max_tokens = int(self.tokens_entry.get().strip())
        except ValueError:
            messagebox.showerror("错误", "最大Tokens必须是有效的整数")
            return None
        
        return {
            "id": agent_id,
            "name": name,
            "apiKeyVariableName": api_key,
            "apiUrl": self.api_url_entry.get().strip(),
            "model": self.model_entry.get().strip(),
            "systemPrompt": self.prompt_text.get(1.0, tk.END).strip(),
            "temperature": temperature,
            "max_tokens": max_tokens,
            "welcomeMessage": self.welcome_text.get(1.0, tk.END).strip()
        }
    
    def save_current_agent(self):
        if self.current_agent_index is None:
            messagebox.showinfo("提示", "请先选择要保存的智能体")
            return
        
        data = self.get_form_data()
        if data:
            self.agents[self.current_agent_index] = data
            self.update_agent_listbox()
            messagebox.showinfo("成功", f"已更新智能体: {data['name']}")
    
    def save_all_agents(self):
        try:
            # 在保存前先创建自动备份
            if os.path.exists('agents.json'):
                # 创建带时间戳的自动备份文件名
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"agents_auto_backup_{timestamp}.json"
                backup_path = os.path.join(self.backup_dir, backup_name)
                
                # 复制当前文件作为备份
                shutil.copy2('agents.json', backup_path)
                print(f"自动备份已创建: {backup_name}")
            
            # 保存到agents.json文件
            with open('agents.json', 'w', encoding='utf-8') as f:
                json.dump(self.agents, f, ensure_ascii=False, indent=2)
            messagebox.showinfo("成功", f"已保存 {len(self.agents)} 个智能体到agents.json\n同时创建了自动备份。")
        except Exception as e:
            messagebox.showerror("错误", f"保存agents.json失败: {str(e)}")
    
    def new_agent(self):
        # 生成一个新的ID
        new_id = str(len(self.agents) + 1)
        
        # 尝试从现有智能体中获取 API 密钥作为默认值
        default_api_key = "YOUR_API_KEY_HERE"
        if self.agents:
            # 使用第一个智能体的 API 密钥作为默认值
            default_api_key = self.agents[0].get('apiKeyVariableName', 'YOUR_API_KEY_HERE')
        
        # 创建新智能体
        new_agent = {
            "id": new_id,
            "name": f"新智能体 {new_id}",
            "apiKeyVariableName": default_api_key,
            "apiUrl": "https://aihubmix.com/v1/chat/completions",
            "model": "gemini-2.0-flash",
            "systemPrompt": "",
            "temperature": 0.7,
            "max_tokens": 2048,
            "welcomeMessage": "直接输入问题，我会回答。"
        }
        
        # 添加到列表
        self.agents.append(new_agent)
        
        # 更新列表框
        self.update_agent_listbox()
        
        # 选择新智能体
        self.agent_listbox.selection_clear(0, tk.END)
        self.agent_listbox.selection_set(len(self.agents) - 1)
        self.on_agent_select(None)
    
    def validate_api_key(self, api_key):
        """验证 API 密钥格式"""
        if not api_key or api_key.strip() == "":
            return False, "API密钥不能为空"
        
        api_key = api_key.strip()
        
        # 检查是否还是占位符
        if api_key == "YOUR_API_KEY_HERE":
            return False, "请替换默认的API密钥占位符"
        
        # 检查基本格式（通常以 sk- 开头）
        if not api_key.startswith(('sk-', 'gsk_', 'API_')):
            return False, "API密钥格式可能不正确（通常以sk-、gsk_或API_开头）"
        
        # 检查长度（一般API密钥都比较长）
        if len(api_key) < 20:
            return False, "API密钥长度可能不正确"
        
        return True, "API密钥格式正确"
    
    def delete_agent(self):
        if self.current_agent_index is None:
            messagebox.showinfo("提示", "请先选择要删除的智能体")
            return
        
        agent_name = self.agents[self.current_agent_index].get('name', 'Unnamed Agent')
        if messagebox.askyesno("确认", f"确定要删除智能体 '{agent_name}' 吗?"):
            del self.agents[self.current_agent_index]
            self.update_agent_listbox()
            
            # 更新当前索引
            if self.agents:
                new_index = min(self.current_agent_index, len(self.agents) - 1)
                self.agent_listbox.selection_set(new_index)
                self.current_agent_index = new_index
                self.on_agent_select(None)
            else:
                self.current_agent_index = None
                self.clear_form()
    
    def duplicate_agent(self):
        if self.current_agent_index is None:
            messagebox.showinfo("提示", "请先选择要复制的智能体")
            return
        
        # 复制当前智能体
        agent_copy = self.agents[self.current_agent_index].copy()
        
        # 修改ID和名称
        agent_copy["id"] = f"{agent_copy['id']}_copy"
        agent_copy["name"] = f"{agent_copy['name']} (复制)"
        
        # 添加到列表
        self.agents.append(agent_copy)
        
        # 更新列表框
        self.update_agent_listbox()
        
        # 选择新智能体
        self.agent_listbox.selection_clear(0, tk.END)
        self.agent_listbox.selection_set(len(self.agents) - 1)
        self.on_agent_select(None)
    
    def clear_form(self):
        self.id_entry.delete(0, tk.END)
        self.name_entry.delete(0, tk.END)
        self.api_key_entry.delete(0, tk.END)
        self.api_url_entry.delete(0, tk.END)
        self.model_entry.delete(0, tk.END)
        self.temp_entry.delete(0, tk.END)
        self.tokens_entry.delete(0, tk.END)
        self.prompt_text.delete(1.0, tk.END)
        self.welcome_text.delete(1.0, tk.END)
    
    def export_agents(self):
        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")],
            title="保存智能体配置"
        )
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(self.agents, f, ensure_ascii=False, indent=2)
                messagebox.showinfo("成功", f"已导出 {len(self.agents)} 个智能体到 {file_path}")
            except Exception as e:
                messagebox.showerror("错误", f"导出失败: {str(e)}")
    
    def import_agents(self):
        file_path = filedialog.askopenfilename(
            filetypes=[("JSON文件", "*.json"), ("所有文件", "*.*")],
            title="导入智能体配置"
        )
        
        if file_path:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    imported_agents = json.load(f)
                
                if not isinstance(imported_agents, list):
                    messagebox.showerror("错误", "导入的文件格式不正确，应为智能体数组")
                    return
                
                if messagebox.askyesno("确认", f"已找到 {len(imported_agents)} 个智能体。要替换当前所有智能体吗?"):
                    self.agents = imported_agents
                else:
                    self.agents.extend(imported_agents)
                
                self.update_agent_listbox()
                messagebox.showinfo("成功", f"已导入 {len(imported_agents)} 个智能体")
                
                # 选择第一个智能体
                if self.agents:
                    self.agent_listbox.selection_set(0)
                    self.on_agent_select(None)
            except Exception as e:
                messagebox.showerror("错误", f"导入失败: {str(e)}")

    def create_backup(self):
        """创建智能体配置的备份"""
        if not self.agents:
            messagebox.showwarning("提示", "没有可备份的智能体配置")
            return
            
        try:
            # 创建带时间戳的备份文件名
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"agents_backup_{timestamp}.json"
            backup_path = os.path.join(self.backup_dir, backup_name)
            
            # 写入备份文件
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(self.agents, f, ensure_ascii=False, indent=2)
                
            messagebox.showinfo("成功", f"备份已创建: {backup_name}")
        except Exception as e:
            messagebox.showerror("错误", f"创建备份失败: {str(e)}")
    
    def restore_backup(self):
        """从备份文件恢复智能体配置"""
        # 获取备份文件列表
        if not os.path.exists(self.backup_dir):
            messagebox.showwarning("提示", "未找到备份目录")
            return
            
        backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.json')]
        if not backup_files:
            messagebox.showwarning("提示", "没有可用的备份文件")
            return
            
        # 创建备份选择窗口
        backup_window = tk.Toplevel(self.root)
        backup_window.title("选择要恢复的备份")
        backup_window.geometry("500x300")
        backup_window.transient(self.root)
        backup_window.grab_set()
        
        # 添加说明标签
        ttk.Label(backup_window, text="选择要恢复的备份文件：").pack(pady=10)
        
        # 创建列表框和滚动条
        frame = ttk.Frame(backup_window)
        frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        scrollbar = ttk.Scrollbar(frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        backup_listbox = tk.Listbox(frame, yscrollcommand=scrollbar.set)
        backup_listbox.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=backup_listbox.yview)
        
        # 填充备份文件列表（按日期排序，最新的在前面）
        backup_files.sort(reverse=True)
        for file in backup_files:
            backup_listbox.insert(tk.END, file)
        
        # 添加按钮
        button_frame = ttk.Frame(backup_window)
        button_frame.pack(fill=tk.X, pady=10)
        
        def do_restore():
            selected = backup_listbox.curselection()
            if not selected:
                messagebox.showwarning("提示", "请选择一个备份文件")
                return
                
            selected_file = backup_files[selected[0]]
            file_path = os.path.join(self.backup_dir, selected_file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    restored_agents = json.load(f)
                
                # 确认是否恢复
                if messagebox.askyesno("确认", f"确定要从 {selected_file} 恢复智能体配置吗？\n这将覆盖当前的所有智能体配置。"):
                    self.agents = restored_agents
                    self.update_agent_listbox()
                    
                    # 如果有智能体，默认选择第一个
                    if self.agents:
                        self.agent_listbox.selection_set(0)
                        self.on_agent_select(None)
                        
                    messagebox.showinfo("成功", f"已从 {selected_file} 恢复 {len(self.agents)} 个智能体配置")
                    backup_window.destroy()
            except Exception as e:
                messagebox.showerror("错误", f"恢复备份失败: {str(e)}")
        
        ttk.Button(button_frame, text="恢复选中备份", command=do_restore).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="取消", command=backup_window.destroy).pack(side=tk.RIGHT, padx=5)
    
    def manage_backups(self):
        """管理备份文件"""
        # 获取备份文件列表
        if not os.path.exists(self.backup_dir):
            messagebox.showwarning("提示", "未找到备份目录")
            return
            
        backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.json')]
        if not backup_files:
            messagebox.showwarning("提示", "没有可用的备份文件")
            return
            
        # 创建备份管理窗口
        manage_window = tk.Toplevel(self.root)
        manage_window.title("管理备份文件")
        manage_window.geometry("600x400")
        manage_window.transient(self.root)
        manage_window.grab_set()
        
        # 添加说明标签
        ttk.Label(manage_window, text="管理备份文件：").pack(pady=10)
        
        # 创建列表框和滚动条
        frame = ttk.Frame(manage_window)
        frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        scrollbar = ttk.Scrollbar(frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        backup_listbox = tk.Listbox(frame, yscrollcommand=scrollbar.set)
        backup_listbox.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=backup_listbox.yview)
        
        # 填充备份文件列表（按日期排序，最新的在前面）
        backup_files.sort(reverse=True)
        for file in backup_files:
            backup_listbox.insert(tk.END, file)
        
        # 添加按钮
        button_frame = ttk.Frame(manage_window)
        button_frame.pack(fill=tk.X, pady=10)
        
        def view_backup():
            selected = backup_listbox.curselection()
            if not selected:
                messagebox.showwarning("提示", "请选择一个备份文件")
                return
                
            selected_file = backup_files[selected[0]]
            file_path = os.path.join(self.backup_dir, selected_file)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    backup_content = json.load(f)
                
                # 创建查看窗口
                view_window = tk.Toplevel(manage_window)
                view_window.title(f"查看备份: {selected_file}")
                view_window.geometry("700x500")
                
                # 创建文本区域
                text_area = scrolledtext.ScrolledText(view_window, wrap=tk.WORD)
                text_area.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
                
                # 显示内容
                formatted_content = json.dumps(backup_content, ensure_ascii=False, indent=2)
                text_area.insert(tk.END, formatted_content)
                text_area.config(state=tk.DISABLED)  # 设为只读
                
                # 添加关闭按钮
                ttk.Button(view_window, text="关闭", command=view_window.destroy).pack(pady=10)
            except Exception as e:
                messagebox.showerror("错误", f"查看备份失败: {str(e)}")
        
        def delete_backup():
            selected = backup_listbox.curselection()
            if not selected:
                messagebox.showwarning("提示", "请选择一个备份文件")
                return
                
            selected_file = backup_files[selected[0]]
            file_path = os.path.join(self.backup_dir, selected_file)
            
            if messagebox.askyesno("确认", f"确定要删除备份文件 {selected_file} 吗？"):
                try:
                    os.remove(file_path)
                    messagebox.showinfo("成功", f"已删除备份文件 {selected_file}")
                    
                    # 更新列表
                    backup_listbox.delete(selected[0])
                    backup_files.pop(selected[0])
                    
                    if not backup_files:
                        manage_window.destroy()
                except Exception as e:
                    messagebox.showerror("错误", f"删除备份失败: {str(e)}")
        
        ttk.Button(button_frame, text="查看备份内容", command=view_backup).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="删除备份", command=delete_backup).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="关闭", command=manage_window.destroy).pack(side=tk.RIGHT, padx=5)

    def clean_old_backups(self, max_backups=30):
        """清理旧备份文件，只保留最近的几个"""
        try:
            if not os.path.exists(self.backup_dir):
                return
                
            backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.json')]
            
            # 如果备份文件数量未超过限制，不需要清理
            if len(backup_files) <= max_backups:
                return
                
            # 按文件名排序（因为包含时间戳，所以新文件会排在后面）
            backup_files.sort()
            
            # 计算需要删除的文件数
            files_to_delete = len(backup_files) - max_backups
            
            # 删除最老的文件
            for i in range(files_to_delete):
                file_path = os.path.join(self.backup_dir, backup_files[i])
                try:
                    os.remove(file_path)
                    print(f"已清理旧备份: {backup_files[i]}")
                except Exception as e:
                    print(f"清理备份失败: {str(e)}")
        except Exception as e:
            print(f"清理备份过程中出错: {str(e)}")

    def sync_to_github(self):
        """同步agents.json到GitHub仓库"""
        # 检查是否配置了GitHub信息
        if not self.github_config['owner'] or not self.github_config['repo']:
            messagebox.showwarning("提示", "请先配置GitHub仓库信息")
            self.show_github_settings()
            return
        
        # 先保存当前agents.json
        try:
            with open('agents.json', 'w', encoding='utf-8') as f:
                # 使用全局导入的json模块
                json.dump(self.agents, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("错误", f"保存agents.json失败: {str(e)}")
            return
        
        # 尝试读取文件内容
        try:
            with open('agents.json', 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            messagebox.showerror("错误", f"读取agents.json失败: {str(e)}")
            return
        
        # 导入需要的模块
        import urllib.request
        import urllib.error
        import base64
        import ssl
        
        # 创建不验证SSL证书的上下文
        ssl_context = ssl._create_unverified_context()
        
        # GitHub文件上传需要提供文件的sha值(如果文件已存在)
        sha = None
        try:
            # 尝试获取GitHub上已有文件的信息
            url = f"https://api.github.com/repos/{self.github_config['owner']}/{self.github_config['repo']}/contents/{self.github_config['file_path']}?ref={self.github_config['branch']}"
            
            # 询问是否需要GitHub访问令牌
            access_token = self.get_github_token()
            
            if access_token:
                headers = {
                    "Accept": "application/vnd.github.v3+json",
                    "Authorization": f"token {access_token}"
                }
                request = urllib.request.Request(url, headers=headers)
            else:
                request = urllib.request.Request(url)
                
            try:
                # 使用不验证SSL证书的上下文
                with urllib.request.urlopen(request, context=ssl_context) as response:
                    # 使用json模块
                    response_content = response.read().decode('utf-8')
                    github_data = json.loads(response_content)
                    sha = github_data.get('sha')
            except urllib.error.HTTPError as e:
                if e.code != 404:  # 404意味着文件不存在，这是正常的
                    messagebox.showerror("错误", f"获取GitHub文件信息失败: {str(e)}")
                    return
        except Exception as e:
            messagebox.showerror("错误", f"获取GitHub文件信息失败: {str(e)}")
            return
        
        # 准备上传文件
        try:
            url = f"https://api.github.com/repos/{self.github_config['owner']}/{self.github_config['repo']}/contents/{self.github_config['file_path']}"
            
            # 准备请求数据
            upload_data = {
                "message": f"Update agents.json via Agent Editor - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "content": base64.b64encode(content.encode('utf-8')).decode('utf-8'),
                "branch": self.github_config['branch']
            }
            
            if sha:
                upload_data["sha"] = sha
            
            # 将数据转换为JSON字符串
            upload_json_data = json.dumps(upload_data).encode('utf-8')
            
            # 创建请求
            if access_token:
                headers = {
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json",
                    "Authorization": f"token {access_token}"
                }
                request = urllib.request.Request(url, data=upload_json_data, headers=headers, method="PUT")
            else:
                headers = {
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                }
                request = urllib.request.Request(url, data=upload_json_data, headers=headers, method="PUT")
            
            # 发送请求
            try:
                # 使用不验证SSL证书的上下文
                with urllib.request.urlopen(request, context=ssl_context) as response:
                    response_data = json.loads(response.read().decode('utf-8'))
                    messagebox.showinfo("成功", f"已成功将agents.json同步到GitHub仓库\n仓库: {self.github_config['owner']}/{self.github_config['repo']}\n分支: {self.github_config['branch']}")
            except urllib.error.HTTPError as e:
                error_message = e.read().decode('utf-8')
                messagebox.showerror("错误", f"同步到GitHub失败: {error_message}")
        except Exception as e:
            messagebox.showerror("错误", f"同步到GitHub失败: {str(e)}")
    
    def get_github_token(self):
        """获取GitHub访问令牌"""
        # 先尝试从配置中获取
        config_file = os.path.join(self.config_dir, 'github_token.txt')
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    return f.read().strip()
            except:
                pass
        
        # 如果没有配置，询问用户
        if messagebox.askyesno("GitHub访问令牌", "要使用GitHub API上传文件需要访问令牌。\n您是否有GitHub访问令牌？\n（令牌需要有repo权限）"):
            token_window = tk.Toplevel(self.root)
            token_window.title("输入GitHub访问令牌")
            token_window.geometry("500x150")
            token_window.transient(self.root)
            token_window.grab_set()
            
            ttk.Label(token_window, text="请输入您的GitHub访问令牌:").pack(pady=10)
            
            token_entry = ttk.Entry(token_window, width=50)
            token_entry.pack(pady=5, padx=10)
            
            def save_token():
                token = token_entry.get().strip()
                if token:
                    try:
                        with open(config_file, 'w') as f:
                            f.write(token)
                        messagebox.showinfo("成功", "GitHub访问令牌已保存")
                        token_window.destroy()
                    except Exception as e:
                        messagebox.showerror("错误", f"保存令牌失败: {str(e)}")
                else:
                    messagebox.showwarning("警告", "令牌不能为空")
            
            button_frame = ttk.Frame(token_window)
            button_frame.pack(fill=tk.X, pady=10)
            
            ttk.Button(button_frame, text="保存", command=save_token).pack(side=tk.LEFT, padx=5)
            ttk.Button(button_frame, text="取消", command=token_window.destroy).pack(side=tk.RIGHT, padx=5)
            
            # 等待窗口关闭
            self.root.wait_window(token_window)
            
            # 再次尝试读取令牌
            if os.path.exists(config_file):
                try:
                    with open(config_file, 'r') as f:
                        return f.read().strip()
                except:
                    pass
        
        return None
    
    def show_github_settings(self):
        """显示GitHub设置界面"""
        settings_window = tk.Toplevel(self.root)
        settings_window.title("GitHub仓库设置")
        settings_window.geometry("550x550")  # 进一步增加窗口高度
        settings_window.minsize(550, 550)    # 设置最小窗口大小，防止缩放隐藏按钮
        settings_window.transient(self.root)
        settings_window.grab_set()
        
        # 创建网格布局，使用grid而不是pack
        settings_window.grid_columnconfigure(0, weight=1)
        settings_window.grid_rowconfigure(0, weight=1)
        settings_window.grid_rowconfigure(1, weight=0)  # 按钮行不会扩展
        
        # 主内容框架
        content_frame = ttk.Frame(settings_window, padding=20)
        content_frame.grid(row=0, column=0, sticky="nsew")
        
        # 表单内容
        content_frame.columnconfigure(0, weight=0)
        content_frame.columnconfigure(1, weight=1)
        
        # 仓库所有者
        row = 0
        ttk.Label(content_frame, text="仓库所有者 (用户名或组织名):").grid(row=row, column=0, sticky="w", pady=5)
        owner_entry = ttk.Entry(content_frame, width=30)
        owner_entry.grid(row=row, column=1, sticky="ew", pady=5)
        owner_entry.insert(0, self.github_config['owner'])
        
        # 仓库名
        row += 1
        ttk.Label(content_frame, text="仓库名:").grid(row=row, column=0, sticky="w", pady=5)
        repo_entry = ttk.Entry(content_frame, width=30)
        repo_entry.grid(row=row, column=1, sticky="ew", pady=5)
        repo_entry.insert(0, self.github_config['repo'])
        
        # 分支
        row += 1
        ttk.Label(content_frame, text="分支:").grid(row=row, column=0, sticky="w", pady=5)
        branch_entry = ttk.Entry(content_frame, width=30)
        branch_entry.grid(row=row, column=1, sticky="ew", pady=5)
        branch_entry.insert(0, self.github_config['branch'])
        
        # 文件路径
        row += 1
        ttk.Label(content_frame, text="文件路径:").grid(row=row, column=0, sticky="w", pady=5)
        file_path_entry = ttk.Entry(content_frame, width=30)
        file_path_entry.grid(row=row, column=1, sticky="ew", pady=5)
        file_path_entry.insert(0, self.github_config['file_path'])
        
        # GitHub令牌管理
        row += 1
        ttk.Label(content_frame, text="GitHub访问令牌:").grid(row=row, column=0, sticky="w", pady=5)
        token_frame = ttk.Frame(content_frame)
        token_frame.grid(row=row, column=1, sticky="ew", pady=5)
        
        # 显示是否已设置令牌
        token_status = "已设置" if self.get_github_token() else "未设置"
        ttk.Label(token_frame, text=token_status).pack(side=tk.LEFT, padx=5)
        ttk.Button(token_frame, text="更改", command=lambda: self.get_github_token()).pack(side=tk.LEFT, padx=5)
        
        # 提示信息
        row += 1
        help_text = """
提示：
1. 您需要有一个GitHub账户和仓库
2. 仓库所有者为您的GitHub用户名或组织名
3. 仓库名为您要上传到的仓库名称
4. 分支通常为main或master
5. 访问令牌可以在GitHub的Settings->Developer settings->Personal access tokens中创建
        """
        help_label = ttk.Label(content_frame, text=help_text, wraplength=450, justify="left")
        help_label.grid(row=row, column=0, columnspan=2, sticky="ew", pady=10)
        
        # 底部分隔线
        row += 1
        separator = ttk.Separator(content_frame, orient='horizontal')
        separator.grid(row=row, column=0, columnspan=2, sticky="ew", pady=10)
        
        # 底部按钮栏 - 使用独立的框架并固定在窗口底部
        button_frame = ttk.Frame(settings_window, padding=10)
        button_frame.grid(row=1, column=0, sticky="ew")
        button_frame.columnconfigure(0, weight=1)
        button_frame.columnconfigure(1, weight=1)
        
        def save_settings():
            # 保存设置
            self.github_config['owner'] = owner_entry.get().strip()
            self.github_config['repo'] = repo_entry.get().strip()
            self.github_config['branch'] = branch_entry.get().strip()
            self.github_config['file_path'] = file_path_entry.get().strip()
            
            # 保存配置
            self.save_github_config()
            settings_window.destroy()
        
        # 使用大号醒目的按钮
        save_button = ttk.Button(
            button_frame, 
            text="保存设置", 
            command=save_settings,
            style="Large.TButton"  # 使用自定义样式
        )
        save_button.grid(row=0, column=0, padx=10, pady=10, sticky="e")
        
        cancel_button = ttk.Button(
            button_frame, 
            text="取消", 
            command=settings_window.destroy
        )
        cancel_button.grid(row=0, column=1, padx=10, pady=10, sticky="w")
        
        # 创建大按钮样式
        style = ttk.Style()
        style.configure("Large.TButton", font=("Arial", 12, "bold"))
    
    def check_api_keys_on_load(self):
        """在加载agents.json后检查所有智能体的API密钥"""
        invalid_agents = []
        for agent in self.agents:
            api_key = agent.get('apiKeyVariableName', '')
            is_valid, error_msg = self.validate_api_key(api_key)
            if not is_valid:
                invalid_agents.append(f"• {agent.get('name', '未命名')} - {error_msg}")
        
        if invalid_agents:
            warning_msg = "发现以下智能体的API密钥可能有问题：\n\n" + "\n".join(invalid_agents)
            warning_msg += "\n\n建议检查并更新这些智能体的API密钥配置。"
            messagebox.showwarning("API密钥检查", warning_msg)

def main():
    root = tk.Tk()
    app = AgentEditor(root)
    
    # 在启动时显示欢迎消息和新功能介绍
    messagebox.showinfo(
        "欢迎使用智能体编辑器", 
        """欢迎使用智能体配置工具！

⚠️ 重要提醒:
• 请确保API密钥正确且有效，否则智能体无法正常工作
• 新建智能体会自动使用现有智能体的API密钥作为默认值
• 保存前会自动验证API密钥格式

新增功能:
• 自动备份: 每次保存智能体配置时都会自动创建备份
• 手动备份: 通过"创建备份"按钮随时保存当前配置
• 备份恢复: 可以恢复到之前的任何一个备份点
• 备份管理: 可以查看、删除和管理备份文件
• GitHub同步: 一键将agents.json同步到GitHub仓库
• API密钥验证: 自动检查密钥格式，防止配置错误

备份文件保存在项目目录下的'backups'文件夹中
GitHub配置保存在项目目录下的'config'文件夹中"""
    )
    
    root.mainloop()

if __name__ == "__main__":
    main() 