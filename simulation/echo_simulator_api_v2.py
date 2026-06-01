"""
ECHO Simulator API v4.0
FastAPI backend - aligned with API Interface Definition v1.0
"""

import random
import json
import statistics
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from echo_simulation_mesa_v2 import (
    EchoSimulation, run_tournament, run_ab_experiment,
    FOUR_POWERS, USER_ROLES
)

app = FastAPI(
    title="ECHO Simulator API",
    description="Real-time ECHO ecosystem simulation backend",
    version="4.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== Request Models ==========

class CreatorConfig(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "平衡型"
    asset_config: Optional[Dict] = None
    initial_work: Optional[Dict] = None

class UserConfig(BaseModel):
    id: Optional[str] = None
    name: str
    role: str = "浏览者"
    preferences: Optional[Dict] = None
    personality: Optional[Dict] = None
    initial_wallet: Optional[float] = None

class EnvironmentParams(BaseModel):
    platform_fee_percent: float = Field(default=5, ge=0, le=50)
    discovery_algorithm: str = "trending"
    market_growth_rate: float = Field(default=0.02, ge=0, le=1)
    cite_fee: float = 1.0
    remix_split_default: float = 0.30

class SimulationConfig(BaseModel):
    duration_days: int = Field(default=30, ge=1, le=365)
    num_creators: int = Field(default=6, ge=1, le=50)
    num_users: int = Field(default=20, ge=1, le=200)
    seed: Optional[int] = None

class RunSimulationRequest(BaseModel):
    simulation_config: SimulationConfig = SimulationConfig()
    creators: Optional[List[CreatorConfig]] = None
    users: Optional[List[UserConfig]] = None
    environment_params: Optional[EnvironmentParams] = EnvironmentParams()

class TournamentRequest(BaseModel):
    simulation_config: SimulationConfig = SimulationConfig()
    strategies: List[str] = Field(default=["保守型", "开放型", "平衡型", "策略型"])
    metrics: List[str] = Field(default=["revenue", "satisfaction", "ecosystem_health", "asset_growth"])
    n_rounds: int = Field(default=10, ge=1, le=100)

class ABExperimentRequest(BaseModel):
    simulation_config: SimulationConfig = SimulationConfig()
    echo_group: Optional[Dict] = None
    control_group: Optional[Dict] = None
    n_rounds: int = Field(default=10, ge=1, le=100)

class RobustnessRequest(BaseModel):
    simulation_config: SimulationConfig = SimulationConfig()
    parameter: str
    range: List[float]
    n_runs_per_value: int = Field(default=10, ge=1, le=50)
    baseline_config: Optional[Dict] = None

# ========== API Endpoints ==========

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "4.0.0",
        "engine": "Mesa v4.0",
        "capabilities": ["single_run", "tournament", "ab_test", "robustness"],
    }

@app.get("/config")
def get_config():
    return {
        "default_simulation": {
            "duration_days": 30,
            "num_creators": 6,
            "num_users": 20,
            "seed": None,
        },
        "creator_types": ["保守型", "开放型", "平衡型", "策略型"],
        "user_roles": list(USER_ROLES.keys()),
        "four_powers": FOUR_POWERS,
        "environment_defaults": {
            "platform_fee_percent": 5,
            "discovery_algorithm": "trending",
            "market_growth_rate": 0.02,
            "cite_fee": 1.0,
            "remix_split_default": 0.30,
        },
        "limits": {
            "num_creators": {"min": 1, "max": 50},
            "num_users": {"min": 1, "max": 200},
            "duration_days": {"min": 1, "max": 365},
        },
    }

@app.post("/run")
def run_simulation(req: RunSimulationRequest):
    try:
        sim_config = req.simulation_config.dict() if req.simulation_config else {"duration_days": 30, "num_creators": 6, "num_users": 20}
        env_params = req.environment_params.dict() if req.environment_params else None
        
        # 创作者配置
        creators = None
        if req.creators:
            creators = []
            for c in req.creators:
                d = c.dict()
                if d.get("asset_config"):
                    d["asset_config"] = d["asset_config"]
                creators.append(d)
        
        # 用户配置
        users = None
        if req.users:
            users = [u.dict() for u in req.users]
        
        sim = EchoSimulation(
            simulation_config=sim_config,
            creators=creators,
            users=users,
            environment_params=env_params,
            seed=sim_config.get("seed") or random.randint(1, 100000),
        )
        
        results = sim.run()
        
        return {
            "success": True,
            "run_id": results["run_id"],
            "config": results["config"],
            "summary": results["summary"],
            "timeseries": results["timeseries"],
            "creator_results": results["creator_results"],
            "asset_lifecycle": results["asset_lifecycle"],
            "user_states": results["user_states"],
            "s_graph_data": results["s_graph_data"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run/tournament")
def run_tournament_endpoint(req: TournamentRequest):
    try:
        sim_config = req.simulation_config.dict()
        results = run_tournament(
            simulation_config=sim_config,
            strategies=req.strategies,
            n_rounds=req.n_rounds,
        )
        return {
            "success": True,
            **results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run/ab")
def run_ab_endpoint(req: ABExperimentRequest):
    try:
        sim_config = req.simulation_config.dict()
        results = run_ab_experiment(
            simulation_config=sim_config,
            n_rounds=req.n_rounds,
        )
        return {
            "success": True,
            **results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/run/robustness")
def run_robustness(req: RobustnessRequest):
    try:
        sim_config = req.simulation_config.dict()
        results = []
        
        for value in req.range:
            env_params = {req.parameter: value}
            if req.baseline_config:
                env_params.update(req.baseline_config)
            
            round_results = []
            for i in range(req.n_runs_per_value):
                sim = EchoSimulation(
                    simulation_config=sim_config,
                    environment_params=env_params,
                    seed=random.randint(1, 100000),
                )
                result = sim.run()
                round_results.append(result["summary"]["total_revenue"])
            
            results.append({
                "value": value,
                "avg_revenue": round(statistics.mean(round_results), 2),
                "std_revenue": round(statistics.stdev(round_results), 2) if len(round_results) > 1 else 0,
                "n_runs": req.n_runs_per_value,
            })
        
        return {
            "success": True,
            "parameter": req.parameter,
            "sensitivity": results,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ========== Main ==========

if __name__ == "__main__":
    print("🚀 ECHO Simulator API v4.0")
    print("=" * 50)
    print("Endpoints:")
    print("  GET  /health        - Health check")
    print("  GET  /config        - Get configuration")
    print("  POST /run           - Run simulation")
    print("  POST /run/tournament  - Run tournament")
    print("  POST /run/ab        - Run A/B experiment")
    print("  POST /run/robustness  - Run robustness test")
    print()
    print("API docs at http://localhost:8000/docs")
    print()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
