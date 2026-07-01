from fastapi import APIRouter

from app.api.routes_agent import router as agent_router
from app.api.routes_agents import router as agents_router
from app.api.routes_health import router as health_router
from app.api.routes_inputs import router as inputs_router
from app.api.routes_issues import router as issues_router
from app.api.routes_overview import router as overview_router
from app.api.routes_pipeline import router as pipeline_router
from app.api.routes_tasks import router as tasks_router
from app.api.routes_wbs import router as wbs_router
from app.api.routes_work import router as work_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(overview_router)
api_router.include_router(tasks_router)
api_router.include_router(wbs_router)
api_router.include_router(work_router)
api_router.include_router(agents_router)
api_router.include_router(issues_router)
api_router.include_router(inputs_router)
api_router.include_router(pipeline_router)
api_router.include_router(agent_router)
