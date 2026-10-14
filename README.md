# CampusConnect

CampusConnect is a campus event discovery and RSVP app, inspired by CIVITAS's full-stack event marketplace pattern. It gives students a quick way to find events, filter by interest, reserve a spot, and host something of their own. The repo doubles as a practical DevOps course project: the app runs locally, while the surrounding folders provide hands-on examples for the syllabus.

## Run it

Requirements: Node.js 20 or newer. No npm packages are needed.

```powershell
npm run check
npm test
npm start
```

Open <http://localhost:3000>. The API seeds a few example events and stores new events and RSVPs in `.data/events.json`.

With Docker Desktop:

```powershell
docker compose up --build
```

Open <http://localhost:8080>. To include Prometheus and Grafana:

```powershell
docker compose --profile observability up --build
```

Prometheus is available at <http://localhost:9090>, Grafana at <http://localhost:3001> (demo login: `admin` / `campusconnect-demo`). Change the Grafana password using `GRAFANA_PASSWORD` before exposing it beyond a local demo.

## What the app does

- Browse seeded events, search by text, and filter by category.
- RSVP to an event; capacity is checked and the attendee count is persisted.
- Host an event with server-side validation and persistent storage.
- Check API readiness at `/health` and scrape basic Prometheus metrics at `/metrics`.

The lightweight Node.js API uses only built-in modules so it can be tested and run without a dependency install. For a production deployment, replace the JSON-file store with a database, add user authentication and authorization, and protect public metrics endpoints.

## Repository map

| Path | Purpose |
| --- | --- |
| `frontend/` | Responsive event discovery UI and Nginx reverse proxy |
| `backend/` | Node.js HTTP API, JSON persistence, health and metrics endpoints |
| `tests/` | API integration tests using Node's built-in test runner |
| `.github/workflows/ci.yml` | GitHub Actions validation and container image builds |
| `Jenkinsfile` | Example Jenkins pipeline (requires a Jenkins NodeJS tool named `Node 22`) |
| `ansible/` | Local inventory and Debian-based Docker host setup playbook |
| `k8s/` | Kubernetes API/web Deployments, Services and Ingress |
| `monitoring/` | Prometheus scrape configuration; Compose profile adds Grafana |
| `lambda/` | Minimal AWS Lambda HTTP API Gateway health handler |
| `airflow/dags/` | Example daily digest DAG |
| `terraform/` | Small AWS infrastructure provisioning lab |
| `docs/` | Suggested Jira backlog and syllabus-to-project mapping |

## Syllabus and experiment mapping

| Syllabus module / experiment | Project exercise |
| --- | --- |
| I. Agile & DevOps; Experiment 01 | Import `docs/agile-backlog.csv` into Jira; make an epic, stories, sprint, and track the GitHub Actions checks. Discuss Kanban vs Scrum and sprint review/retrospective. |
| II. Git & collaboration; Experiment 02 | Create a feature branch, commit, push, open a PR, review it, and intentionally resolve a small merge conflict. Try GitHub Issues and a project board. |
| III. CI/CD & Docker; Experiments 03, 05, 06, 08 | Run `npm test`, examine `.github/workflows/ci.yml` and `Jenkinsfile`, build both images, and use Docker Compose to run the web/API services. Extend CI to publish to a registry only after configuring secrets. |
| IV. Ansible, Kubernetes & Terraform; Experiments 04, 07, 09 | Review `ansible/playbook.yml`; load images into a local Kubernetes cluster and apply `k8s/`; use the Terraform lab to provision a small AWS network. Explore Helm and remote state as extensions. |
| V. Monitoring, serverless & MLOps; Experiments 10, 11 | Scrape `/metrics` with Prometheus, connect Grafana, deploy `lambda/handler.js` to AWS Lambda, and discuss how an MLflow experiment or scheduled Airflow digest could extend the service. |
| VI. End-to-end pipeline | Draw Agile → Git → CI → containers → Kubernetes → monitoring; add a deployment approval, secrets scanning, and a short demo/readme. Select one cloud for deployment and estimate its cost first. |

The Lambda and Airflow examples are teaching starting points, not wired into the app's production request path. Cloud credentials, a Kubernetes cluster, Jenkins, and Jira are intentionally not required to run the local project.

## Local Kubernetes quick start

Build the images and load them into your local cluster (for example, `kind` or Minikube), then:

```powershell
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/web.yaml
kubectl get pods,services,ingress
```

The manifests use `campusconnect-api:latest` and `campusconnect-web:latest`. Build/load those exact image names first. The API's `emptyDir` is intentionally ephemeral to demonstrate pod storage; use a PersistentVolumeClaim and an external database for real deployments. An Nginx Ingress controller is needed to use the included Ingress resource.

## Security and operations notes

- CI builds images but does not publish them; no registry credentials or cloud secrets are needed.
- `k8s/` includes resource requests/limits and health probes. Add TLS, restricted network policies, and secret management before a shared deployment.
- The sample Grafana password is for local learning only.
- `ansible/playbook.yml` expects a Debian-family target with privilege escalation.
- Review the AWS region, CIDR ranges, and estimated spend in `terraform/` before applying anything.
