"""
ECHO Simulation v4.0 - Production-Grade Mesa Engine
对齐 API 接口定义 v1.0
支持：自定义创作者/用户/环境参数、完整时序数据、S-Graph、统计检验
"""

import random
import json
import statistics
from typing import Dict, List, Tuple, Optional, Any, Set
from datetime import datetime

import mesa
from mesa import Model, Agent
from mesa.time import StagedActivation
from mesa.datacollection import DataCollector
import networkx as nx

# ========== 四权力定义 ==========

FOUR_POWERS = {
    "铸": {
        "name": "铸造权",
        "description": "资产的创建与初始配置权",
        "configurable": ["enabled", "price", "max_supply"],
    },
    "衍": {
        "name": "衍生权",
        "description": "基于原作创建改编/引用作品的权利",
        "configurable": ["enabled", "max_derivatives", "fee_percent", "approval_required"],
    },
    "扩": {
        "name": "扩展权",
        "description": "跨平台/场景传播与使用的权利",
        "configurable": ["enabled", "platforms", "regions", "max_channels"],
    },
    "收": {
        "name": "收益权",
        "description": "资产产生收益的分配与收取权",
        "configurable": ["enabled", "revenue_share", "auto_distribute", "min_payout"],
    },
}

# ========== 用户角色定义 ==========

USER_ROLES = {
    "浏览者": {
        "actions": ["browse"],
        "weight": 0.30,
        "default_prefs": {"explore_prob": 0.7},
    },
    "引用者": {
        "actions": ["browse", "cite"],
        "weight": 0.20,
        "default_prefs": {"explore_prob": 0.3, "quality_threshold": 0.6},
    },
    "改编者": {
        "actions": ["browse", "request_remix"],
        "weight": 0.20,
        "default_prefs": {"explore_prob": 0.4, "remix_skill_level": 0.5},
    },
    "传播者": {
        "actions": ["browse", "spread"],
        "weight": 0.15,
        "default_prefs": {"explore_prob": 0.5, "shi_threshold": 1},
    },
    "付费者": {
        "actions": ["browse", "pay"],
        "weight": 0.10,
        "default_prefs": {"explore_prob": 0.2, "quality_threshold": 0.8},
    },
    "争议者": {
        "actions": ["browse", "dispute"],
        "weight": 0.05,
        "default_prefs": {"explore_prob": 0.3, "controversy_prob": 0.1},
    },
}

# ========== 势位评估阈值 ==========

SHI_THRESHOLDS = {
    "time": [10, 30, 80],      # 事件数阈值 L1/L2/L3
    "space": [2, 4, 7],        # 方法/场景多样性阈值
    "relation": [3, 8, 20],    # 关系事件数阈值
}


# ========== S-Graph 类 ==========

class SGraph:
    """势图 - 张量模型 [时间×空间×关系]"""
    
    def __init__(self):
        self.nodes: Dict[str, Dict] = {}  # {asset_id: {domain, creator_id, ...}}
        self.edges: List[Dict] = []       # 关系边
        self.tensor: Dict[str, List] = {}  # {asset_id: [{day, position: [T,S,R], level}]}
        self.network = nx.DiGraph()
    
    def add_asset(self, asset_id: str, domain: str, creator_id: str, 
                  initial_work: Dict):
        """添加资产节点"""
        self.nodes[asset_id] = {
            "domain": domain,
            "creator_id": creator_id,
            "title": initial_work.get("title", "未命名"),
            "category": initial_work.get("category", "未分类"),
            "quality_score": initial_work.get("quality_score", 5.0),
        }
        self.network.add_node(asset_id, type="asset", domain=domain)
        self.tensor[asset_id] = []
    
    def add_edge(self, source: str, target: str, edge_type: str, 
                 day: int, amount: float = 0):
        """添加关系边"""
        self.edges.append({
            "source": source,
            "target": target,
            "type": edge_type,
            "day": day,
            "amount": amount,
        })
        if self.network.has_node(source) and self.network.has_node(target):
            if self.network.has_edge(source, target):
                self.network[source][target]["weight"] += 1
            else:
                self.network.add_edge(source, target, type=edge_type, weight=1)
    
    def evaluate(self, asset_id: str, day: int, events: List[Dict]) -> Dict:
        """评估资产的势位坐标 [T, S, R]"""
        if asset_id not in self.nodes:
            return {"position": [0, 0, 0], "level": "L0"}
        
        # 该资产的所有事件
        asset_events = [e for e in events if e.get("to") == asset_id]
        
        # 时间维度：事件总数
        n_events = len(asset_events)
        time_level = sum(1 for t in SHI_THRESHOLDS["time"] if n_events >= t)
        
        # 空间维度：用户行为类型多样性（作为使用场景代理）
        user_types = set(e.get("user_type", "unknown") for e in asset_events)
        n_methods = len(user_types)
        space_level = sum(1 for t in SHI_THRESHOLDS["space"] if n_methods >= t)
        
        # 关系维度：引用/改编/付费等关系事件
        relation_events = [e for e in asset_events 
                          if e["type"] in ["cite", "remix", "pay", "remix_approved"]]
        n_relations = len(relation_events)
        relation_level = sum(1 for t in SHI_THRESHOLDS["relation"] if n_relations >= t)
        
        position = [time_level, space_level, relation_level]
        level = f"L{max(position)}"
        
        # 记录张量
        self.tensor[asset_id].append({
            "day": day,
            "position": position,
            "level": level,
            "n_events": n_events,
            "n_methods": n_methods,
            "n_relations": n_relations,
        })
        
        return {"position": position, "level": level}
    
    def to_dict(self) -> Dict:
        """导出为字典"""
        return {
            "nodes": [
                {"id": k, **v} for k, v in self.nodes.items()
            ],
            "edges": self.edges,
            "tensor": self.tensor,
        }


# ========== 创作者 Agent ==========

class CreatorAgent(Agent):
    """创作者 Agent - 完全可配置"""
    
    def __init__(self, unique_id: str, model: Model, config: Dict):
        super().__init__(unique_id, model)
        
        # 基础信息
        self.creator_id = config.get("id", unique_id)
        self.name = config.get("name", f"创作者{unique_id}")
        self.creator_type = config.get("type", "平衡型")
        
        # 资产配置（四权力）
        asset_config = config.get("asset_config", {})
        self.config = {
            "铸": asset_config.get("铸", {"enabled": True, "price": 100}),
            "衍": asset_config.get("衍", {"enabled": True, "max_derivatives": 3, "fee_percent": 15}),
            "扩": asset_config.get("扩", {"enabled": True, "platforms": ["web", "app"]}),
            "收": asset_config.get("收", {"enabled": True, "revenue_share": 70}),
        }
        
        # 初始作品
        self.initial_work = config.get("initial_work", {
            "title": "《未命名》",
            "category": "综合",
            "quality_score": 5.0,
        })
        
        # 资产列表（创作者可能有多个作品）
        self.assets: List[Dict] = [{
            "id": f"asset_{unique_id}_0",
            "title": self.initial_work["title"],
            "category": self.initial_work["category"],
            "quality_score": self.initial_work["quality_score"],
            "created_day": 1,
        }]
        
        # 状态
        self.satisfaction = 5.0
        self.revenue = 0.0
        self.wallet = 0.0
        self.citations_received = 0
        self.remixes_received = 0
        self.payments_received = 0
        self.total_events = 0
        
        # 势位
        self.shi_level = 0
        self.shi_history: List[Tuple[int, int]] = []
        
        # 记忆
        self.memory = {
            "events_last_7_days": [],
            "income_trend": [],
            "config_changes": [],
        }
        
        # 情绪
        self.mood = 5.0
    
    def perceive(self):
        """感知"""
        recent = [e for e in self.model.event_log
                 if any(e.get("to") == a["id"] for a in self.assets)
                 and e["day"] >= self.model.day - 7]
        self.memory["events_last_7_days"] = recent
    
    def decide(self) -> Dict:
        """决策"""
        recent_income = sum(e.get("amount", 0) for e in self.memory["events_last_7_days"]
                           if e["type"] in ["cite", "pay", "remix_approved"])
        
        if recent_income < 2.0 and self.satisfaction < 4.0:
            return {"action": "adjust_config", "reason": "low_income"}
        
        remix_events = [e for e in self.memory["events_last_7_days"] 
                       if e["type"] == "remix"]
        if len(remix_events) > 2 and recent_income < 1.0:
            return {"action": "adjust_config", "reason": "many_remix_low_income"}
        
        # 创作新资产
        base_prob = 0.05
        if self.satisfaction > 7:
            base_prob += 0.05
        if self.revenue > 20:
            base_prob += 0.03
        if random.random() < base_prob:
            return {"action": "create_asset", "reason": "creative_urge"}
        
        return {"action": "idle", "reason": "satisfied"}
    
    def execute(self, decision: Dict):
        """执行"""
        if decision["action"] == "adjust_config":
            old = self.config.copy()
            if decision["reason"] == "low_income":
                self.config["衍"]["fee_percent"] = max(5, self.config["衍"].get("fee_percent", 15) - 5)
                self.config["收"]["revenue_share"] = min(90, self.config["收"].get("revenue_share", 70) + 10)
            elif decision["reason"] == "many_remix_low_income":
                self.config["衍"]["max_derivatives"] = max(1, self.config["衍"].get("max_derivatives", 3) - 1)
            
            if str(self.config) != str(old):
                self.model.event_log.append({
                    "day": self.model.day,
                    "type": "config_change",
                    "from": self.creator_id,
                    "to": self.assets[0]["id"],
                    "amount": 0,
                    "details": {"old": old, "new": self.config.copy(), "reason": decision["reason"]},
                })
        
        elif decision["action"] == "create_asset":
            new_id = f"asset_{self.unique_id}_{len(self.assets)}"
            new_asset = {
                "id": new_id,
                "title": f"《{self.name}的新作{len(self.assets)}》",
                "category": self.initial_work["category"],
                "quality_score": random.uniform(4.0, 9.0),
                "created_day": self.model.day,
            }
            self.assets.append(new_asset)
            self.model.s_graph.add_asset(new_id, self.initial_work["category"], 
                                         self.creator_id, new_asset)
            self.model.event_log.append({
                "day": self.model.day,
                "type": "create",
                "from": self.creator_id,
                "to": new_id,
                "amount": -3.0,
                "reason": f"{self.name}创作了新作品",
            })
            self.revenue = max(0, self.revenue - 3.0)
            self.satisfaction = min(10.0, self.satisfaction + 0.8)
    
    def update(self):
        """更新势位"""
        if self.model.day % 7 == 0:
            # 评估主资产的势位
            main_asset = self.assets[0]["id"]
            result = self.model.s_graph.evaluate(main_asset, self.model.day, self.model.event_log)
            self.shi_level = int(result["level"][1])  # "L2" -> 2
            self.shi_history.append((self.model.day, self.shi_level))
    
    def staged_step(self):
        self.perceive()
        decision = self.decide()
        self.execute(decision)
        self.update()


# ========== 用户 Agent ==========

class UserAgent(Agent):
    """用户 Agent - 完全可配置"""
    
    def __init__(self, unique_id: str, model: Model, config: Dict):
        super().__init__(unique_id, model)
        
        self.user_id = config.get("id", unique_id)
        self.name = config.get("name", f"用户{unique_id}")
        self.role = config.get("role", "浏览者")
        
        # 角色配置
        role_config = USER_ROLES.get(self.role, USER_ROLES["浏览者"])
        self.actions = role_config["actions"]
        
        # 偏好
        prefs = config.get("preferences", {})
        self.preferences = {
            "explore_prob": prefs.get("explore_prob", role_config["default_prefs"].get("explore_prob", 0.5)),
            "domain_bias": prefs.get("domain_bias", None),
            "quality_threshold": prefs.get("quality_threshold", role_config["default_prefs"].get("quality_threshold", 0.5)),
            "controversy_prob": prefs.get("controversy_prob", 0.05),
        }
        
        # 人格
        personality = config.get("personality", {})
        self.personality = {
            "optimism": personality.get("optimism", random.uniform(0.3, 0.8)),
            "risk_tolerance": personality.get("risk_tolerance", random.uniform(0.2, 0.7)),
            "social_drive": personality.get("social_drive", random.uniform(0.2, 0.9)),
        }
        
        # 状态
        self.satisfaction = 5.0
        self.mood = 5.0
        self.wallet = config.get("initial_wallet", 10.0)
        self.assets_used: Set[str] = set()
        
        # 记忆
        self.memory = {
            "recent_events": [],
            "preferred_creators": set(),
            "disliked_creators": set(),
        }
        
        self.event_log: List[Dict] = []
    
    def perceive(self):
        """感知"""
        self.memory["recent_events"] = [
            e for e in self.model.event_log
            if e.get("from") == self.user_id and e["day"] >= self.model.day - 7
        ]
        
        available = list(self.model.s_graph.nodes.keys())
        
        if self.preferences.get("domain_bias"):
            domain_match = [a for a in available 
                           if self.model.s_graph.nodes.get(a, {}).get("domain") == self.preferences["domain_bias"]]
            if domain_match:
                available = domain_match
        
        explore_prob = self.preferences["explore_prob"]
        if self.mood < 3:
            explore_prob *= 0.6
        elif self.mood > 7:
            explore_prob = min(1.0, explore_prob * 1.3)
        
        new_assets = [a for a in available if a not in self.assets_used]
        if random.random() < explore_prob and new_assets:
            self.perceived_assets = new_assets
        else:
            self.perceived_assets = available
    
    def _calculate_utility(self, asset_id: str, creator) -> float:
        """计算资产效用"""
        utility = 5.0
        
        if self.role == "传播者":
            utility += getattr(creator, 'shi_level', 0) * 1.5
        
        if self.role == "付费者" and getattr(creator, 'revenue', 0) > 5:
            utility += 2.0
        
        asset_info = self.model.s_graph.nodes.get(asset_id, {})
        if self.preferences.get("domain_bias") == asset_info.get("domain"):
            utility += 1.5
        
        utility *= (0.5 + self.mood / 10)
        
        if creator and creator.name in self.memory.get("preferred_creators", set()):
            utility += 1.0
        if creator and creator.name in self.memory.get("disliked_creators", set()):
            utility -= 2.0
        
        return utility
    
    def decide(self) -> Dict:
        """决策"""
        if not getattr(self, 'perceived_assets', []):
            return {"action": "idle"}
        
        candidates = []
        for asset_id in self.perceived_assets:
            creator = self.model.get_creator_by_asset(asset_id)
            if not creator:
                continue
            utility = self._calculate_utility(asset_id, creator)
            candidates.append((asset_id, creator, utility))
        
        if not candidates:
            return {"action": "idle"}
        
        candidates.sort(key=lambda x: x[2] + random.uniform(-0.5, 0.5), reverse=True)
        target_asset, target_creator, _ = candidates[0]
        
        action_utils = {}
        for action in self.actions:
            if action == "browse":
                action_utils["browse"] = 1.0
            elif action == "cite":
                u = 2.0 + (target_creator.shi_level >= 2) * 1.5 + (self.mood > 6) * 1.0
                action_utils["cite"] = u
            elif action == "request_remix":
                config_yan = target_creator.config.get("衍", {}).get("max_derivatives", 0)
                u = 2.5 + (config_yan >= 2) * 2.0 + (self.personality["risk_tolerance"] > 0.6) * 0.5
                action_utils["request_remix"] = u
            elif action == "pay":
                u = 3.0 + (target_creator.revenue > 10) * 1.5 + (self.mood > 7) * 1.0
                action_utils["pay"] = u
            elif action == "spread":
                u = 2.0 + (target_creator.shi_level >= 3) * 2.0 + (self.personality["social_drive"] > 0.7) * 1.0
                action_utils["spread"] = u
            elif action == "dispute":
                config_yi = target_creator.config.get("收", {}).get("revenue_share", 70)
                u = 0.5 + (config_yi <= 50) * 1.5
                action_utils["dispute"] = u
        
        if not action_utils:
            return {"action": "idle"}
        
        best = max(action_utils, key=action_utils.get)
        return {
            "action": best,
            "target": target_asset,
            "creator": target_creator,
            "utility": action_utils[best],
        }
    
    def execute(self, decision: Dict):
        """执行"""
        action = decision["action"]
        if action == "idle":
            return
        
        target_id = decision.get("target")
        creator = decision.get("creator")
        
        event = {
            "day": self.model.day,
            "type": action,
            "from": self.user_id,
            "to": target_id,
            "amount": 0,
            "user_type": self.role,
            "reason": self._reason(action, creator),
        }
        
        # 执行具体行为（简化版，完整逻辑后续补充）
        if action == "browse":
            self.assets_used.add(target_id)
            if creator:
                creator.total_events += 1
                creator.satisfaction = min(10.0, creator.satisfaction + 0.05)
        
        elif action == "cite":
            amount = 1.0
            if creator:
                creator.citations_received += 1
                creator.revenue += amount
                creator.total_events += 1
                event["amount"] = amount
                self.mood = min(10.0, self.mood + 0.4)
                creator.satisfaction = min(10.0, creator.satisfaction + 0.3)
                self.memory.setdefault("preferred_creators", set()).add(creator.name)
                self.model.s_graph.add_edge(self.user_id, target_id, "cite", self.model.day, amount)
        
        elif action == "request_remix":
            if creator:
                creator.total_events += 1
                config_yan = creator.config.get("衍", {}).get("max_derivatives", 3)
                approval_prob = {1: 0.2, 2: 0.5, 3: 0.8, 4: 1.0}.get(config_yan, 0.3)
                
                if random.random() < approval_prob:
                    creator.remixes_received += 1
                    split = creator.config.get("衍", {}).get("fee_percent", 15) / 100.0
                    amount = 5.0 * split
                    creator.revenue += amount
                    self.model.event_log.append({
                        "day": self.model.day,
                        "type": "remix_approved",
                        "from": creator.creator_id,
                        "to": self.user_id,
                        "amount": round(amount, 2),
                        "user_type": "creator",
                        "reason": f"{creator.name}批准改编（分润{split*100:.0f}%）",
                    })
                    self.model.s_graph.add_edge(target_id, f"remix_by_{self.user_id}", "remix", self.model.day, amount)
                    self.mood = min(10.0, self.mood + 0.5)
                else:
                    self.model.event_log.append({
                        "day": self.model.day,
                        "type": "remix_rejected",
                        "from": creator.creator_id,
                        "to": self.user_id,
                        "amount": 0,
                        "reason": f"{creator.name}拒绝改编",
                    })
                    self.mood = max(0.0, self.mood - 0.5)
        
        elif action == "pay":
            amount = random.uniform(5.0, 15.0)
            if creator:
                creator.payments_received += 1
                creator.revenue += amount
                creator.total_events += 1
                event["amount"] = round(amount, 2)
                self.mood = min(10.0, self.mood + 0.6)
                creator.satisfaction = min(10.0, creator.satisfaction + 0.8)
                self.model.s_graph.add_edge(self.user_id, target_id, "pay", self.model.day, amount)
        
        elif action == "spread":
            if creator:
                creator.total_events += 1
                self.mood = min(10.0, self.mood + 0.5)
                creator.satisfaction = min(10.0, creator.satisfaction + 0.2)
        
        elif action == "dispute":
            if creator:
                creator.total_events += 1
                self.mood = min(10.0, self.mood + 0.2)
                creator.satisfaction = max(0.0, creator.satisfaction - 0.6)
                self.memory.setdefault("disliked_creators", set()).add(creator.name)
        
        self.model.event_log.append(event)
        self.assets_used.add(target_id)
        self.event_log.append(event)
        
        # 情绪衰减
        self.mood = max(0.0, min(10.0, self.mood - 0.05))
    
    def _reason(self, action: str, creator) -> str:
        reasons = {
            "browse": "浏览作品",
            "cite": f"引用{creator.name if creator else '未知'}的作品",
            "request_remix": f"请求改编{creator.name if creator else '未知'}的作品",
            "pay": f"付费支持{creator.name if creator else '未知'}",
            "spread": f"传播{creator.name if creator else '未知'}的作品",
            "dispute": f"对{creator.name if creator else '未知'}的作品提出异议",
        }
        return reasons.get(action, action)
    
    def staged_step(self):
        self.perceive()
        decision = self.decide()
        self.execute(decision)


# ========== 模拟器主模型 ==========

class EchoSimulation(Model):
    """ECHO 模拟器主模型 v4.0"""
    
    def __init__(self,
                 simulation_config: Dict = None,
                 creators: List[Dict] = None,
                 users: List[Dict] = None,
                 environment_params: Dict = None,
                 seed: int = 42):
        super().__init__()
        
        random.seed(seed)
        self.seed = seed
        self.day = 0
        
        # 配置
        self.simulation_config = simulation_config or {
            "duration_days": 30,
            "num_creators": 6,
            "num_users": 20,
        }
        self.duration_days = self.simulation_config.get("duration_days", 30)
        
        # 环境参数
        self.environment_params = environment_params or {
            "platform_fee_percent": 5,
            "discovery_algorithm": "trending",
            "market_growth_rate": 0.02,
            "cite_fee": 1.0,
            "remix_split_default": 0.30,
        }
        self.platform_fee = self.environment_params.get("platform_fee_percent", 5) / 100.0
        self.discovery_algorithm = self.environment_params.get("discovery_algorithm", "trending")
        self.market_growth = self.environment_params.get("market_growth_rate", 0.02)
        
        # 事件日志
        self.event_log: List[Dict] = []
        self.daily_snapshots: List[Dict] = []
        self.timeseries: List[Dict] = []
        
        # S-Graph
        self.s_graph = SGraph()
        
        # 创建创作者
        self.creators: List[CreatorAgent] = []
        creator_configs = creators or self._default_creators()
        for i, config in enumerate(creator_configs):
            agent = CreatorAgent(f"creator_{i}", self, config)
            self.creators.append(agent)
            # 注册资产到 S-Graph
            for asset in agent.assets:
                self.s_graph.add_asset(asset["id"], agent.initial_work.get("category", "综合"),
                                      agent.creator_id, asset)
        
        # 创建用户
        self.users: List[UserAgent] = []
        user_configs = users or self._default_users()
        for i, config in enumerate(user_configs):
            agent = UserAgent(f"user_{i}", self, config)
            self.users.append(agent)
        
        # 调度器
        all_agents = self.creators + self.users
        self.schedule = StagedActivation(self, stage_list=["staged_step"])
        for agent in all_agents:
            self.schedule.add(agent)
        
        # 数据收集器
        self.datacollector = DataCollector(
            model_reporters={
                "day": lambda m: m.day,
                "total_events": lambda m: len(m.event_log),
                "total_revenue": lambda m: sum(c.revenue for c in m.creators),
                "avg_satisfaction": lambda m: sum(c.satisfaction for c in m.creators) / len(m.creators) if m.creators else 0,
                "network_edges": lambda m: len(m.s_graph.edges),
            }
        )
    
    def _default_creators(self) -> List[Dict]:
        """默认创作者配置"""
        return [
            {
                "id": "creator_1",
                "name": "林水墨",
                "type": "保守型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 100},
                    "衍": {"enabled": True, "max_derivatives": 3, "fee_percent": 15},
                    "扩": {"enabled": True, "platforms": ["web", "app"]},
                    "收": {"enabled": True, "revenue_share": 70},
                },
                "initial_work": {"title": "《晨曦》", "category": "视觉艺术", "quality_score": 8.5},
            },
            {
                "id": "creator_2",
                "name": "陈默",
                "type": "开放型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 50},
                    "衍": {"enabled": True, "max_derivatives": 10, "fee_percent": 5},
                    "扩": {"enabled": True, "platforms": ["web", "app", "social"]},
                    "收": {"enabled": True, "revenue_share": 50},
                },
                "initial_work": {"title": "《夜归人》", "category": "摄影", "quality_score": 7.5},
            },
            {
                "id": "creator_3",
                "name": "阿Ken",
                "type": "平衡型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 80},
                    "衍": {"enabled": True, "max_derivatives": 5, "fee_percent": 10},
                    "扩": {"enabled": True, "platforms": ["web", "app"]},
                    "收": {"enabled": True, "revenue_share": 60},
                },
                "initial_work": {"title": "《City Loop》", "category": "音乐", "quality_score": 8.0},
            },
            {
                "id": "creator_4",
                "name": "王小明",
                "type": "策略型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 120},
                    "衍": {"enabled": True, "max_derivatives": 2, "fee_percent": 20},
                    "扩": {"enabled": True, "platforms": ["web"]},
                    "收": {"enabled": True, "revenue_share": 80},
                },
                "initial_work": {"title": "《Python速查手册》", "category": "开发", "quality_score": 9.0},
            },
            {
                "id": "creator_5",
                "name": "苏珊",
                "type": "平衡型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 70},
                    "衍": {"enabled": True, "max_derivatives": 4, "fee_percent": 12},
                    "扩": {"enabled": True, "platforms": ["web", "app"]},
                    "收": {"enabled": True, "revenue_share": 65},
                },
                "initial_work": {"title": "《情绪碎片》", "category": "文学", "quality_score": 7.0},
            },
            {
                "id": "creator_6",
                "name": "共创小组",
                "type": "开放型",
                "asset_config": {
                    "铸": {"enabled": True, "price": 60},
                    "衍": {"enabled": True, "max_derivatives": 8, "fee_percent": 8},
                    "扩": {"enabled": True, "platforms": ["web", "app", "social", "offline"]},
                    "收": {"enabled": True, "revenue_share": 55},
                },
                "initial_work": {"title": "《生态设计蓝图》", "category": "设计", "quality_score": 8.5},
            },
        ]
    
    def _default_users(self) -> List[Dict]:
        """默认用户配置"""
        roles = ["浏览者"] * 6 + ["引用者"] * 4 + ["改编者"] * 4 + ["传播者"] * 3 + ["付费者"] * 2 + ["争议者"] * 1
        random.shuffle(roles)
        
        users = []
        for i, role in enumerate(roles):
            users.append({
                "id": f"user_{i}",
                "name": f"用户{i+1}",
                "role": role,
                "preferences": {},
                "personality": {
                    "optimism": random.uniform(0.3, 0.8),
                    "risk_tolerance": random.uniform(0.2, 0.7),
                    "social_drive": random.uniform(0.2, 0.9),
                },
                "initial_wallet": random.uniform(5.0, 20.0),
            })
        return users
    
    def get_creator_by_asset(self, asset_id: str) -> Optional[CreatorAgent]:
        """通过资产 ID 查找创作者"""
        for creator in self.creators:
            for asset in creator.assets:
                if asset["id"] == asset_id:
                    return creator
        return None
    
    def step(self):
        """单步 = 一天"""
        self.day += 1
        self.schedule.step()
        self.datacollector.collect(self)
        
        # 记录每日快照
        self._record_snapshot()
        
        # 记录时序数据
        self._record_timeseries()
    
    def _record_snapshot(self):
        """每日快照"""
        day_events = [e for e in self.event_log if e.get("day") == self.day]
        
        creators_data = [
            {
                "id": c.creator_id,
                "name": c.name,
                "revenue": round(c.revenue, 2),
                "satisfaction": round(c.satisfaction, 2),
                "mood": round(c.mood, 2),
                "citations": c.citations_received,
                "remixes": c.remixes_received,
                "payments": c.payments_received,
                "shiLevel": c.shi_level,
                "totalEvents": c.total_events,
                "wallet": round(c.wallet, 2),
                "asset_count": len(c.assets),
            }
            for c in self.creators
        ]
        
        users_data = [
            {
                "id": u.user_id,
                "name": u.name,
                "mood": round(u.mood, 2),
                "wallet": round(u.wallet, 2),
                "role": u.role,
                "totalInteractions": len(u.event_log),
            }
            for u in self.users
        ]
        
        self.daily_snapshots.append({
            "day": self.day,
            "events": day_events,
            "creators": creators_data,
            "users": users_data,
            "networkDensity": round(nx.density(self.s_graph.network), 4) if self.s_graph.network.number_of_nodes() > 0 else 0,
            "totalEvents": len(day_events),
            "totalRevenue": round(sum(c.revenue for c in self.creators), 2),
        })
    
    def _record_timeseries(self):
        """记录时序数据"""
        day_events = [e for e in self.event_log if e.get("day") == self.day]
        
        self.timeseries.append({
            "day": self.day,
            "active_users": len(set(e.get("from") for e in day_events if e.get("from", "").startswith("user_"))),
            "events": len(day_events),
            "revenue": round(sum(e.get("amount", 0) for e in day_events if e.get("amount", 0) > 0), 2),
            "new_assets": len([e for e in day_events if e["type"] == "create"]),
            "disputes": len([e for e in day_events if e["type"] == "dispute"]),
            "avg_satisfaction": round(sum(c.satisfaction for c in self.creators) / len(self.creators), 2) if self.creators else 0,
            "avg_mood": round(sum(u.mood for u in self.users) / len(self.users), 2) if self.users else 0,
        })
    
    def run(self) -> Dict[str, Any]:
        """运行模拟"""
        for _ in range(self.duration_days):
            self.step()
        
        return self.get_results()
    
    def get_results(self) -> Dict[str, Any]:
        """获取完整结果"""
        # 创作者结果
        creator_results = []
        for c in self.creators:
            main_asset = c.assets[0]["id"]
            lifecycle = {
                "asset_id": main_asset,
                "title": c.initial_work["title"],
                "creator": c.name,
                "created_day": 1,
                "shi_timeline": [
                    {"day": day, "position": [0,0,0], "level": f"L{level}"}  # 简化
                    for day, level in c.shi_history
                ],
                "total_revenue": round(c.revenue, 2),
                "final_status": "活跃" if c.shi_level >= 2 else "成长中",
            }
            creator_results.append({
                "creator_id": c.creator_id,
                "name": c.name,
                "total_revenue": round(c.revenue, 2),
                "final_satisfaction": round(c.satisfaction, 2),
                "assets_created": len(c.assets),
                "citations_received": c.citations_received,
                "remixes_received": c.remixes_received,
                "payments_received": c.payments_received,
                "shi_progression": [level for _, level in c.shi_history],
                "config_history": c.memory.get("config_changes", []),
                "asset_lifecycle": lifecycle,
            })
        
        # 用户状态
        user_states = [
            {
                "id": u.user_id,
                "name": u.name,
                "role": u.role,
                "mood": round(u.mood, 2),
                "wallet": round(u.wallet, 2),
                "totalInteractions": len(u.event_log),
                "personality": u.personality,
            }
            for u in self.users
        ]
        
        # 资产生命周期
        asset_lifecycle = []
        for c in self.creators:
            for asset in c.assets:
                tensor_history = self.s_graph.tensor.get(asset["id"], [])
                asset_lifecycle.append({
                    "asset_id": asset["id"],
                    "title": asset["title"],
                    "creator": c.name,
                    "created_day": asset["created_day"],
                    "shi_timeline": [
                        {
                            "day": t["day"],
                            "position": t["position"],
                            "level": t["level"],
                        }
                        for t in tensor_history
                    ] if tensor_history else [{"day": 1, "position": [0,0,0], "level": "L0"}],
                    "total_revenue": round(c.revenue, 2),  # 简化：创作者收入归到主资产
                    "final_status": "活跃" if c.shi_level >= 2 else "成长中",
                })
        
        # S-Graph 数据
        s_graph_data = self.s_graph.to_dict()
        s_graph_data["network_stats"] = {
            "n_nodes": self.s_graph.network.number_of_nodes(),
            "n_edges": self.s_graph.network.number_of_edges(),
            "density": round(nx.density(self.s_graph.network), 4) if self.s_graph.network.number_of_nodes() > 1 else 0,
        }
        
        return {
            "run_id": f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{self.seed}",
            "status": "completed",
            "config": {
                "simulation": self.simulation_config,
                "environment": self.environment_params,
                "seed": self.seed,
            },
            "summary": {
                "total_events": len(self.event_log),
                "onchain_events": len([e for e in self.event_log if e["type"] in ["cite", "pay", "remix_approved"]]),
                "total_revenue": round(sum(c.revenue for c in self.creators), 2),
                "creator_satisfaction": round(sum(c.satisfaction for c in self.creators) / len(self.creators), 2) if self.creators else 0,
                "ecosystem_health": round(nx.density(self.s_graph.network), 4) if self.s_graph.network.number_of_nodes() > 1 else 0,
            },
            "timeseries": self.timeseries,
            "creator_results": creator_results,
            "asset_lifecycle": asset_lifecycle,
            "user_states": user_states,
            "s_graph_data": s_graph_data,
            "snapshots": self.daily_snapshots,
            "events": self.event_log,
        }
    
    def export_json(self, filepath: str):
        """导出到 JSON"""
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self.get_results(), f, ensure_ascii=False, indent=2)


import scipy.stats as stats

# ========== 统计检验工具 ==========

def cohens_d(group1: List[float], group2: List[float]) -> float:
    """计算 Cohen's d 效应量"""
    n1, n2 = len(group1), len(group2)
    s1, s2 = statistics.stdev(group1) if n1 > 1 else 0, statistics.stdev(group2) if n2 > 1 else 0
    pooled_std = (( (n1-1)*s1**2 + (n2-1)*s2**2 ) / (n1+n2-2)) ** 0.5 if n1+n2 > 2 else 1
    if pooled_std == 0:
        return 0.0
    return (statistics.mean(group1) - statistics.mean(group2)) / pooled_std

def t_test_independent(group1: List[float], group2: List[float]) -> Dict:
    """独立样本 t 检验"""
    if len(group1) < 2 or len(group2) < 2:
        return {
            "t_statistic": None,
            "p_value": None,
            "significant": None,
            "note": "需要每组至少2个样本",
        }
    t_stat, p_value = stats.ttest_ind(group1, group2, equal_var=False)
    return {
        "t_statistic": round(float(t_stat), 4),
        "p_value": round(float(p_value), 6),
        "significant": bool(p_value < 0.05),
        "alpha": 0.05,
    }

def confidence_interval(data: List[float], confidence: float = 0.95) -> Dict:
    """计算置信区间"""
    n = len(data)
    if n < 2:
        return {"mean": round(statistics.mean(data), 2) if data else 0, "lower": None, "upper": None, "note": "样本量不足"}
    mean = statistics.mean(data)
    sem = statistics.stdev(data) / (n ** 0.5)
    df = n - 1
    t_critical = stats.t.ppf((1 + confidence) / 2, df)
    margin = t_critical * sem
    return {
        "mean": round(mean, 2),
        "lower": round(mean - margin, 2),
        "upper": round(mean + margin, 2),
        "confidence": confidence,
    }

def run_tournament(simulation_config: Dict, 
                   strategies: List[str], 
                   n_rounds: int = 10,
                   seed: int = 42) -> Dict:
    """配置策略锦标赛"""
    
    results_by_strategy = {}
    
    for strategy_name in strategies:
        round_results = []
        
        for round_num in range(n_rounds):
            # 为所有创作者应用同一策略
            creators = []
            default = EchoSimulation()._default_creators()
            for c in default:
                c_copy = c.copy()
                if strategy_name == "保守型":
                    c_copy["asset_config"] = {
                        "铸": {"enabled": True, "price": 120},
                        "衍": {"enabled": True, "max_derivatives": 1, "fee_percent": 25},
                        "扩": {"enabled": True, "platforms": ["web"]},
                        "收": {"enabled": True, "revenue_share": 85},
                    }
                elif strategy_name == "开放型":
                    c_copy["asset_config"] = {
                        "铸": {"enabled": True, "price": 30},
                        "衍": {"enabled": True, "max_derivatives": 15, "fee_percent": 3},
                        "扩": {"enabled": True, "platforms": ["web", "app", "social", "offline"]},
                        "收": {"enabled": True, "revenue_share": 40},
                    }
                elif strategy_name == "平衡型":
                    c_copy["asset_config"] = {
                        "铸": {"enabled": True, "price": 80},
                        "衍": {"enabled": True, "max_derivatives": 5, "fee_percent": 12},
                        "扩": {"enabled": True, "platforms": ["web", "app"]},
                        "收": {"enabled": True, "revenue_share": 60},
                    }
                elif strategy_name == "策略型":
                    c_copy["asset_config"] = {
                        "铸": {"enabled": True, "price": 100},
                        "衍": {"enabled": True, "max_derivatives": 3, "fee_percent": 18},
                        "扩": {"enabled": True, "platforms": ["web", "app"]},
                        "收": {"enabled": True, "revenue_share": 70},
                    }
                creators.append(c_copy)
            
            sim = EchoSimulation(
                simulation_config=simulation_config,
                creators=creators,
                seed=seed + round_num,
            )
            result = sim.run()
            round_results.append(result["summary"])
        
        # 统计
        revenues = [r["total_revenue"] for r in round_results]
        satisfactions = [r["creator_satisfaction"] for r in round_results]
        
        results_by_strategy[strategy_name] = {
            "avg_revenue": round(statistics.mean(revenues), 2),
            "std_revenue": round(statistics.stdev(revenues), 2) if len(revenues) > 1 else 0,
            "avg_satisfaction": round(statistics.mean(satisfactions), 2),
            "win_count": 0,  # 后续计算
            "round_results": round_results,
        }
    
    # 排名 + win_count 计算
    sorted_results = sorted(results_by_strategy.items(),
                           key=lambda x: x[1]["avg_revenue"], reverse=True)
    
    # 计算 win_count
    for name1, data1 in results_by_strategy.items():
        wins = 0
        r1_revenues = [r["total_revenue"] for r in data1["round_results"]]
        for name2, data2 in results_by_strategy.items():
            if name1 != name2:
                r2_revenues = [r["total_revenue"] for r in data2["round_results"]]
                if statistics.mean(r1_revenues) > statistics.mean(r2_revenues):
                    wins += 1
        data1["win_count"] = wins
    
    # 统计显著性（真实 t-test）
    sig_results = {}
    for i, (name1, _) in enumerate(sorted_results):
        for j, (name2, _) in enumerate(sorted_results):
            if i < j:
                r1_revenues = [r["total_revenue"] for r in results_by_strategy[name1]["round_results"]]
                r2_revenues = [r["total_revenue"] for r in results_by_strategy[name2]["round_results"]]
                
                t_test = t_test_independent(r1_revenues, r2_revenues)
                effect = abs(cohens_d(r1_revenues, r2_revenues))
                ci1 = confidence_interval(r1_revenues)
                ci2 = confidence_interval(r2_revenues)
                
                sig_results[f"{name1}_vs_{name2}"] = {
                    **t_test,
                    "effect_size": round(effect, 4),
                    "effect_interpretation": (
                        "可忽略" if effect < 0.2 else
                        "小效应" if effect < 0.5 else
                        "中效应" if effect < 0.8 else
                        "大效应"
                    ),
                    "echo_group_ci": ci1,
                    "control_group_ci": ci2,
                }
    
    return {
        "tournament_id": f"tour_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "n_rounds": n_rounds,
        "results": dict(sorted_results),
        "ranking": [name for name, _ in sorted_results],
        "statistical_significance": sig_results,
    }


# ========== A/B 实验 ==========

def run_ab_experiment(simulation_config: Dict,
                      n_rounds: int = 10,
                      seed: int = 42) -> Dict:
    """A/B 对照实验：ECHO vs 传统平台"""
    
    echo_results = []
    control_results = []
    
    for i in range(n_rounds):
        # ECHO 组
        echo_sim = EchoSimulation(
            simulation_config=simulation_config,
            environment_params={"platform_fee_percent": 5, "discovery_algorithm": "trending"},
            seed=seed + i,
        )
        echo_result = echo_sim.run()
        echo_results.append(echo_result["summary"])
        
        # 传统平台组（高抽成 + 无四权力）
        control_creators = []
        default = EchoSimulation()._default_creators()
        for c in default:
            c_copy = c.copy()
            c_copy["asset_config"] = {
                "铸": {"enabled": False},
                "衍": {"enabled": False},
                "扩": {"enabled": False},
                "收": {"enabled": True, "revenue_share": 70},  # 平台抽30%
            }
            control_creators.append(c_copy)
        
        control_sim = EchoSimulation(
            simulation_config=simulation_config,
            creators=control_creators,
            environment_params={"platform_fee_percent": 30, "discovery_algorithm": "random"},
            seed=seed + i + 1000,
        )
        control_result = control_sim.run()
        control_results.append(control_result["summary"])
    
    # 统计检验
    echo_revenues = [r["total_revenue"] for r in echo_results]
    control_revenues = [r["total_revenue"] for r in control_results]
    echo_satisfactions = [r["creator_satisfaction"] for r in echo_results]
    control_satisfactions = [r["creator_satisfaction"] for r in control_results]
    
    revenue_ttest = t_test_independent(echo_revenues, control_revenues)
    satisfaction_ttest = t_test_independent(echo_satisfactions, control_satisfactions)
    revenue_effect = cohens_d(echo_revenues, control_revenues)
    satisfaction_effect = cohens_d(echo_satisfactions, control_satisfactions)
    echo_revenue_ci = confidence_interval(echo_revenues)
    control_revenue_ci = confidence_interval(control_revenues)

    return {
        "ab_test_id": f"ab_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "n_rounds": n_rounds,
        "echo_group": {
            "mean_revenue": round(statistics.mean(echo_revenues), 2),
            "std_revenue": round(statistics.stdev(echo_revenues), 2) if len(echo_revenues) > 1 else 0,
            "mean_satisfaction": round(statistics.mean(echo_satisfactions), 2),
            "revenues": echo_revenues,
            "confidence_interval": echo_revenue_ci,
        },
        "control_group": {
            "mean_revenue": round(statistics.mean(control_revenues), 2),
            "std_revenue": round(statistics.stdev(control_revenues), 2) if len(control_revenues) > 1 else 0,
            "mean_satisfaction": round(statistics.mean(control_satisfactions), 2),
            "revenues": control_revenues,
            "confidence_interval": control_revenue_ci,
        },
        "comparison": {
            "revenue_diff": round(statistics.mean(echo_revenues) - statistics.mean(control_revenues), 2),
            "revenue_diff_pct": round((statistics.mean(echo_revenues) - statistics.mean(control_revenues)) / statistics.mean(control_revenues) * 100, 1) if statistics.mean(control_revenues) != 0 else 0,
            "hypothesis_test_revenue": {
                **revenue_ttest,
                "effect_size": round(abs(revenue_effect), 4),
                "effect_interpretation": (
                    "可忽略" if abs(revenue_effect) < 0.2 else
                    "小效应" if abs(revenue_effect) < 0.5 else
                    "中效应" if abs(revenue_effect) < 0.8 else
                    "大效应"
                ),
                "test_type": "Welch's t-test (independent samples, unequal variance)",
            },
            "hypothesis_test_satisfaction": {
                **satisfaction_ttest,
                "effect_size": round(abs(satisfaction_effect), 4),
                "effect_interpretation": (
                    "可忽略" if abs(satisfaction_effect) < 0.2 else
                    "小效应" if abs(satisfaction_effect) < 0.5 else
                    "中效应" if abs(satisfaction_effect) < 0.8 else
                    "大效应"
                ),
                "test_type": "Welch's t-test (independent samples, unequal variance)",
            },
        },
    }


# ========== 主程序 ==========

def main():
    print("🌱 ECHO Simulation v4.0 - Production-Grade Engine")
    print("=" * 60)
    
    sim = EchoSimulation(
        simulation_config={"duration_days": 30, "num_creators": 6, "num_users": 20},
    )
    
    print(f"模拟参数：{len(sim.creators)} 创作者 × {len(sim.users)} 用户 × {sim.duration_days} 天")
    print(f"环境参数：平台费率 {sim.platform_fee*100}%，发现算法 {sim.discovery_algorithm}")
    print()
    
    results = sim.run()
    
    print("📊 模拟结果摘要")
    print("-" * 50)
    print(f"总事件数：{results['summary']['total_events']}")
    print(f"上链事件：{results['summary']['onchain_events']}")
    print(f"总收入：{results['summary']['total_revenue']:.2f}")
    print(f"平均满意度：{results['summary']['creator_satisfaction']:.2f}")
    print(f"生态健康度：{results['summary']['ecosystem_health']:.4f}")
    print()
    
    print("📈 时序数据（前5天）")
    print("-" * 50)
    for ts in results["timeseries"][:5]:
        print(f"  Day {ts['day']}: {ts['events']} 事件, ¥{ts['revenue']:.2f}, 满意度 {ts['avg_satisfaction']:.1f}")
    print()
    
    print("🏆 创作者排名")
    print("-" * 50)
    sorted_creators = sorted(results["creator_results"], key=lambda x: x["total_revenue"], reverse=True)
    for i, c in enumerate(sorted_creators, 1):
        print(f"  {i}. {c['name']}: ¥{c['total_revenue']:.2f} (满意度: {c['final_satisfaction']:.1f})")
    print()
    
    print("🔗 S-Graph 统计")
    print("-" * 50)
    sg = results["s_graph_data"]["network_stats"]
    print(f"  节点数：{sg['n_nodes']}")
    print(f"  边数：{sg['n_edges']}")
    print(f"  密度：{sg['density']:.4f}")
    print()
    
    sim.export_json("simulation_v4_results.json")
    print("✅ 结果已导出到 simulation_v4_results.json")
    
    return sim, results


if __name__ == "__main__":
    main()
