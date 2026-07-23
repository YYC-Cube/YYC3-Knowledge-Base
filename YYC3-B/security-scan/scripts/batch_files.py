#!/usr/bin/env python3
"""
文件分组脚本：根据文件大小和模块优先级自动分组，用于批量安全审计
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# 模块优先级规则（P0 > P1 > P2）
# ---------------------------------------------------------------------------

# 路径关键词 → (优先级, 标签)
PRIORITY_RULES = [
    # P0：入口点 + 数据访问层 + 安全配置
    (re.compile(r'(controller|handler|endpoint|route|api)', re.I), 0, "Controller/入口层"),
    (re.compile(r'(dao|repository|mapper|store)', re.I), 0, "数据访问层"),
    (re.compile(r'(security|auth|permission|acl)', re.I), 0, "安全配置"),
    # P1：服务层 + 工具类
    (re.compile(r'(service|manager|provider|facade)', re.I), 1, "Service 层"),
    (re.compile(r'(util|helper|crypto|serial|http|client|request)', re.I), 1, "工具类"),
    # P2：模型 + 其他
    (re.compile(r'(model|dto|entity|bean|pojo|vo)', re.I), 2, "Model/DTO"),
]


def get_priority_and_label(file_path):
    """根据文件路径判断优先级和标签"""
    path_str = str(file_path)
    for pattern, priority, label in PRIORITY_RULES:
        if pattern.search(path_str):
            return priority, label
    return 2, "其他"


def count_lines(file_path):
    """统计文件行数"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


def merge_small_batches(batches, min_files=10):
    """合并过小的批次，避免产生只有 1-2 个文件的碎片批次"""
    if len(batches) <= 1:
        return batches
    merged = []
    current = list(batches[0])
    for batch in batches[1:]:
        if len(current) < min_files:
            current.extend(batch)
        else:
            merged.append(current)
            current = list(batch)
    if current:
        merged.append(current)
    return merged


def group_files(files, max_lines_per_batch=2000, min_files_per_batch=10):
    """
    按文件大小分组
    
    策略：
    - 大文件(>500行): 单独分析
    - 其他文件: 累积到 max_lines_per_batch 行后分批
    - 过小批次(< min_files_per_batch): 合并到相邻批次
    """
    file_info = []
    for f in files:
        lines = count_lines(f)
        file_info.append({'path': f, 'lines': lines})
    
    file_info.sort(key=lambda x: x['lines'])
    
    batches = []
    current_batch = []
    current_lines = 0
    
    for info in file_info:
        file_lines = info['lines']
        file_path = info['path']
        
        if file_lines > 500:
            if current_batch:
                batches.append(current_batch)
                current_batch = []
                current_lines = 0
            batches.append([file_path])
            continue
        
        if current_batch and current_lines + file_lines > max_lines_per_batch:
            batches.append(current_batch)
            current_batch = []
            current_lines = 0
        
        current_batch.append(file_path)
        current_lines += file_lines
    
    if current_batch:
        batches.append(current_batch)
    
    return merge_small_batches(batches, min_files_per_batch)


def group_files_by_priority(files, max_lines_per_batch=2000, min_files_per_batch=10):
    """
    按模块优先级分组：先按优先级分桶，每个桶内再按文件大小分批。
    返回的批次按 P0 → P1 → P2 排序。
    """
    # 按优先级分桶
    buckets = {}  # priority → [(path, lines, label)]
    for f in files:
        priority, label = get_priority_and_label(f)
        lines = count_lines(f)
        buckets.setdefault(priority, []).append((f, lines, label))

    all_batches = []
    for priority in sorted(buckets.keys()):
        items = buckets[priority]
        # 取该优先级桶中最常见的标签作为批次标签
        label_counts = {}
        for _, _, label in items:
            label_counts[label] = label_counts.get(label, 0) + 1
        dominant_label = max(label_counts, key=label_counts.get)

        # 桶内按行数排序后分批
        items.sort(key=lambda x: x[1])
        current_batch = []
        current_lines = 0

        for path, line_count, _ in items:
            if line_count > 500:
                if current_batch:
                    all_batches.append((current_batch, dominant_label, priority))
                    current_batch = []
                    current_lines = 0
                all_batches.append(([path], dominant_label, priority))
                continue

            if current_batch and current_lines + line_count > max_lines_per_batch:
                all_batches.append((current_batch, dominant_label, priority))
                current_batch = []
                current_lines = 0

            current_batch.append(path)
            current_lines += line_count

        if current_batch:
            all_batches.append((current_batch, dominant_label, priority))

    # 合并过小批次（同一优先级内）
    if len(all_batches) > 1:
        merged = []
        current_files, current_label, current_priority = all_batches[0]
        current_files = list(current_files)
        for batch_files, label, priority in all_batches[1:]:
            if priority == current_priority and len(current_files) < min_files_per_batch:
                current_files.extend(batch_files)
            else:
                merged.append((current_files, current_label, current_priority))
                current_files = list(batch_files)
                current_label = label
                current_priority = priority
        merged.append((current_files, current_label, current_priority))
        all_batches = merged

    return all_batches


def main():
    parser = argparse.ArgumentParser(description='按文件大小和模块优先级分组，用于批量安全审计')
    parser.add_argument('files', nargs='+', help='要分组的文件路径列表')
    parser.add_argument('--max-lines', type=int, default=2000, 
                        help='每批次最大行数（默认2000）')
    parser.add_argument('--min-files-per-batch', type=int, default=10,
                        help='每批次最少文件数，过小的批次会被合并（默认10）')
    parser.add_argument('--priority', action='store_true',
                        help='启用模块优先级排序（P0 入口层 → P1 服务层 → P2 模型层）')
    parser.add_argument('--output', '-o', help='输出分组结果到JSON文件')
    
    args = parser.parse_args()
    
    valid_files = [f for f in args.files if os.path.exists(f)]
    
    if not valid_files:
        print(json.dumps({"error": "没有有效文件"}))
        sys.exit(1)
    
    result = {
        'total_files': len(valid_files),
        'batches': []
    }

    if args.priority:
        priority_batches = group_files_by_priority(valid_files, args.max_lines, args.min_files_per_batch)
        for i, (batch_files, label, priority) in enumerate(priority_batches, 1):
            result['batches'].append({
                'batch_id': i,
                'batch_label': f"P{priority} {label}",
                'priority': priority,
                'files': batch_files,
                'file_count': len(batch_files),
                'total_lines': sum(count_lines(f) for f in batch_files)
            })
    else:
        batches = group_files(valid_files, args.max_lines, args.min_files_per_batch)
        for i, batch in enumerate(batches, 1):
            result['batches'].append({
                'batch_id': i,
                'batch_label': f"批次 {i}",
                'files': batch,
                'file_count': len(batch),
                'total_lines': sum(count_lines(f) for f in batch)
            })

    result['total_batches'] = len(result['batches'])
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"分组结果已保存到: {args.output}")
    else:
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
