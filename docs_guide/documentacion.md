TECSUP HIGHER TECHNOLOGICAL INSTITUTE SOFTWARE DESIGN AND DEVELOPMENT




COURSE: Cloud Solutions Development

TEACHING:   Ing. Victor Calvo G.

	CROWDPASS


PRESENTED BY:

Sergio Jimenez 
Josue Choquepuma







Arequipa – Perú 2026 
1. INTRODUCTION	5
2. OBJECTIVES	6
2.1 General objective	6
2.2 Specific objectives	6
3. GENERAL PROJECT CONTEXT	6
4. PROJECT TECHNOLOGIES AND TOOLS	7
4.1 Main stack	7
4.2 Cloud services	7
4.3 Testing tools- Selenium	7
4.4 Supporting tools	7
5. PHASE-BASED DEVELOPMENT	8
5.1.1 Architecture implemented in Phase 1	10
5.1.2 Modular backend structure	11
5.1.3 Cloud preparation	13
5.1.4 Implemented endpoints	16
5.1.5 Initial CRUD and functional logic	19
5.1.6 Initial authentication and authorization	22
5.1.7 Initial backend security	23
5.1.8 Environment variables	25
5.1.9 HTTP error handling	26
5.1.10 PostgreSQL connection and Neon preparation	28
5.1.11 Database model	31
5.1.12 Initial concurrency strategy	33
5.1.13 Testing strategy	35
5.1.14 Base automated tests	36
5.1.15 Real tests against the database	37
5.1.16 Concurrent tests with K6	38
5.1.17 Detected technical incidents	42
5.1.18 Obtained technical evidence	45
5.1.19 Initial frontend implementation	46
5.1.20 Navigation and separation between public and private views	48
5.1.21 Frontend integration with the API	51
5.1.22 Special frontend screens: 404 and maintenance	54
5.1.23 Frontend Preparation for Deployment on Vercel	57
6. ACHIEVED MILESTONE	59
7. CONCLUSION	59
8. ANNEXES	60
9. REFERENCES	60





Figure 1:	11
General view of the repository showing the base	11
Figure 2:	12
Simple architecture diagram React , Express and PostgreSQL	12
Figure 3:	14
Backend folder tree showing “src, db, tests, docs, and k6”	14
Figure 4:	15
GitHub repository with the project uploaded	15
Figure 5:	16
Neon dashboard showing the created PostgreSQL database	16
Figure 6:	16
Render dashboard showing the configured backend service	16
Figure 7:	18
Successful response from “GET /api/health”	18
Figure 8:	18
Test of  “POST /api/auth/register”	18
Figure 9:	19
Test of “POST /api/auth/login” showing the token	19
Figure 10:	19
Response from “GET /api/events” with real data	19
Figure 11:	21
Evidence of user or event CRUD with a protected route	21
Figure 12:	22
Reservation service fragment showing transactional logic	22
Figure 13:	23
JWT token correctly generated after login	23
Figure 14:	24
Restricted access test to an administrative route	24
Figure 15:	25
Rate limiting middleware configuration	25
Figure 16:	26
Evidence of the password hash stored in the database	26
Figure 17:	27
“env.example” file opened in the editor	27
Figure 18:	28
Test of a missing route returning `404`	28
Figure 19:	29
Example of a structured JSON response from the backend	29
Figure 20:	30
Console or `health` endpoint showing `database: "connected"`	30
Figure 21:	31
Response of events retrieved from PostgreSQL	31
Figure 22:	32
Neon dashboard with the active instance	32
Figure 23:	33
Editable database diagram	33
Figure 24:	34
“schema.sql” file showing tables and main constraints	34
Fragment of the reservation service showing “BEGIN”, “FOR UPDATE”, or controlled ticket updates	35
Figure 26:	36
Simple diagram of the testing strategy used in Phase 1	36
Figure 27:	37
“Npm test” output showing “2 suites” and “5 passing tests”	37
Figure 29:	39
“POST /api/auth/login” test against real PostgreSQL	39
Figure 30:	40
“k6 version” output	40
Figure 31:	41
First run with “connection refused” error	41
Figure 32:	42
Second run affected by “rate limiting”	42
Figure 33:	43
Third final run with valid results	43
Figure 34:	45
Initial PostgreSQL connection error	45
Figure 35:	45
Evidence of correct K6 installation	45
Figure 36:	46
Comparison between the failed run and the final corrected run	46
Figure 37:	48
React frontend structure opened in VS Code	48
Figure 38:	49
“Frontend/.env.example” file showing the API base URL	49
Figure 39:	50
Frontend landing page running in the browser	50
Figure 40:	51
Login or registration view in the frontend	51
Figure 41:	52
Private navigation with role-based dashboard	52
Figure 42:	53
Events view consuming real data from the API	53
Figure 43:	54
Administrator dashboard showing users from the backend	54
Figure 44:	54
Customer dashboard showing reservations or personal space	54
Figure 45:	56
Frontend “404” page in the browser	56
Figure 46:	57
Maintenance view shown when the server is unavailable	57
Figure 47:	58
Frontend returning to normal state after the service recovers	58
Figure 48:	59
Frontend configuration reference ready for deployment on Vercel	59














INTRODUCTION
CROWDPASS is a platform focused on event management and online reservations, inspired by solutions such as Joinnus. The project aims to build a technical foundation capable of supporting progressive growth in functionality, concurrency, security, testing, and cloud deployment, while maintaining consistency with a professional backend architecture from the earliest development stages.
The documentation pre
sented summarizes the general structure of the project, the adopted technological approach, and the development carried out through phases. Its purpose is to serve as the main tracking document so that each future submission can expand the existing content without losing technical or academic coherence.
From its initial design, CROWDPASS considers backend stability, data integrity, authentication security, preparation for concurrent testing, and compatibility with cloud services as its main pillars. For that reason, the project was organized from the beginning under a modular structure that allows functionality to grow without rebuilding the architecture.

OBJECTIVES
2.1 General objective
Develop a web platform for event management and online reservations, built on a modular, secure, and scalable technical foundation, capable of evolving through phases until it becomes a complete and fully functional system.
2.2 Specific objectives
- Implement a backend based on Node.js and Express.
- Integrate PostgreSQL as the relational persistence system.
- Establish secure authentication through JWT and password hashing.
- Organize the project in layers to facilitate maintenance and growth.
- Prepare the system for automated testing, API testing, and concurrent validations.
- Maintain compatibility with a cloud architecture based on Vercel, Render, and Railway.
- Document project development progressively and in alignment with each delivery phase.
GENERAL PROJECT CONTEXT
The CROWDPASS project was defined to be developed under a decoupled architecture composed of frontend, backend, and database, using independent cloud services for each layer. This decision responds to the need to maintain technical order, deployment simplicity, and progressive system growth.
The proposal includes the use of React for the user interface, Node.js with Express for the backend API, and PostgreSQL as the relational database. In terms of infrastructure, Vercel was defined for the frontend, Render for the backend, and Railway for the database. For testing, Selenium is considered for functional testing, Bruno for API testing, and K6 for load, stress, and concurrency testing.
PROJECT TECHNOLOGIES AND TOOLS
4.1 Main stack
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
4.2 Cloud services
- Frontend hosting: Vercel
- Backend hosting: Render
- Database hosting: Railway
4.3 Testing tools- Selenium
- Bruno
- K6
- Jest
- Supertest
4.4 Supporting tools
- Git
- GitHub
- Environment variables with `.env`
- Technical diagramming and documentation
 PHASE-BASED DEVELOPMENT
PHASE 1 - INITIAL TECHNICAL FOUNDATION
The first phase of the project was focused on building the initial technical foundation of the system and preparing the environment required for its progressive development. During this stage, priority was given to the modular backend structure, initial authentication, PostgreSQL connection, base CRUD organization, HTTP response control, environment variable configuration, minimum server security, and the first automated and concurrent tests. As a complementary step, an initial React frontend layer was also incorporated in order to begin materializing the product's visual experience on top of the API that had already been built.

Within this phase, the main system endpoints were implemented, including service monitoring, authentication, and the initial management of users, events, and reservations. Security measures were also incorporated, such as password hashing with `bcrypt`, authentication using `JWT`, the use of `helmet`, `cors` configuration, and `rate limiting` policies to protect sensitive requests. On top of this foundation, an initial interface was enabled with public views, role-protected routes, and special screens for invalid navigation or temporary service unavailability.

The PostgreSQL environment in Neon was also prepared at the level of structure and connection variables, while schema execution, data loading, and functional validations were carried out in the local environment. In the testing component, Jest and Supertest were used for base automated tests, while K6 made it possible to execute initial concurrent tests with virtual users and record incidents, results, and adjustments applied during the process. As a result, this phase left both the backend functional foundation and a first real end-to-end system journey available from the frontend.

From an academic and technical perspective, this phase was not limited to building an isolated set of routes or tests, but rather to establishing the foundation on which the next stages of the project will be built. The main objective was to demonstrate that CROWDPASS already has a consistent architecture across frontend, backend, and database, an initial security strategy, a connected persistence layer, and a minimum set of validations that allow development to continue without rebuilding core components.
Description: 

Figure 1:  General view of the repository showing the base 
5.1.1 Architecture implemented in Phase 1
The architecture defined for this phase follows the official project stack and establishes a clear separation between client, server, and persistence. The frontend is planned with React and deployment on Vercel, the backend was developed with Node.js and Express considering Render as the hosting provider, and the relational database was configured on PostgreSQL using Neon.
From the beginning, this organization made it possible to work with a decoupled API, prepared for progressive growth and compatible with future system expansion without the need to redesign the entire technical foundation.
This architecture also provides clarity in the distribution of responsibilities. The frontend is reserved for user experience and endpoint consumption, while the backend concentrates business logic, authentication control, access validation, and communication with the database. PostgreSQL, in turn, ensures relational persistence, data integrity, and support for transactional operations required in a reservation system.

Figure 2: 
Simple architecture diagram React , Express and PostgreSQL


Notes: Created with IA
5.1.2 Modular backend structure
The backend was organized into layers to maintain separation of responsibilities and facilitate maintenance. The `routes` folder groups the endpoints exposed by the API, `controllers` coordinates request handling and response construction, `services` contains business logic, `models` encapsulates database queries, `middlewares` manages authentication, error control, and request limiting, `config` centralizes variables and connections, and `utils` groups reusable components.
This structure makes it possible to scale the project in a more organized way and prevents the application from becoming a monolithic backend that is difficult to maintain.
The decision to separate the backend into modules from this first phase reduces the risk of disorganized growth. Instead of concentrating routes, SQL queries, and business rules in a few files, each component fulfills a specific function. This not only improves code readability, but also simplifies testing, future fixes, and evolutionary maintenance.

Figure 3: 
Backend folder tree showing “src, db, tests, docs, and k6” 

				Notes: Created in Visual Code
5.1.3 Cloud preparation
As part of the initial technical foundation, the cloud environment required for the project was prepared. Neon was defined as the PostgreSQL provider, Render as the planned backend service, and Vercel as the frontend hosting platform. The GitHub repository was also configured, and the project structure was verified to be compatible with deployment on Node.js services.
Although a full production deployment is not documented in this phase, the conditions required to continue development under a cloud scheme consistent with the proposed architecture were validated.
Cloud preparation plays an important role because it prevents the project from depending exclusively on the local environment. By defining the deployment and persistence ecosystem from the beginning, future rework is reduced and the transition toward phases with greater demands for stability, deployment, and server testing becomes easier.

Figure 4: 
GitHub repository with the project uploaded 

Notes: Created in GitHub 
Figure 5: 
Neon dashboard showing the created PostgreSQL database

Notes: Created in Neon
Figure 6: 
Render dashboard showing the configured backend service

Notes: Created in Render
5.1.4 Implemented endpoints
During this phase, the main API endpoints were built and organized by functional modules:
- `GET /api/health` to verify backend availability and PostgreSQL connectivity.
- `POST /api/auth/register` for user registration.
- `POST /api/auth/login` for authentication and JWT token generation.
- `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id`, and `DELETE /api/users/:id` for initial user management under administrative control.
- `GET /api/events`, `GET /api/events/:id`, `POST /api/events`, `PUT /api/events/:id`, and `DELETE /api/events/:id` for the events module.
- `GET /api/reservations`, `GET /api/reservations/:id`, `POST /api/reservations`, `PATCH /api/reservations/:id/cancel`, and `DELETE /api/reservations/:id` for the initial reservations module.
With this foundation, the system already provides monitoring, authentication, and a structured CRUD over the main domain entities.
The existence of these endpoints demonstrates that the backend is no longer in a merely structural state, but in a functional one. The implemented modules cover key project needs: verifying service availability, authenticating users, managing events, handling reservations, and protecting sensitive operations through authorization.

Figure 7: 
Successful response from “GET /api/health”

Notes: Created in Local Host
Figure 8: 
Test of  “POST /api/auth/register”

Notes: Created in Bruno
Figure 9: 
Test of “POST /api/auth/login” showing the token

Notes: Created in Bruno
Figure 10: 
Response from “GET /api/events” with real data


Notes: Created in Bruno
5.1.5 Initial CRUD and functional logic
The implementation of users, events, and reservations constitutes the starting point of the system CRUD. It is not yet a complete CRUD for all future project needs, but it is a functional foundation that demonstrates persistence, route protection, access control, and layered organization.
In the case of reservations, transactional logic was incorporated to avoid inconsistencies in ticket inventory, which is especially important in a system focused on concurrency and the management of limited capacity.
This point is important because the initial CRUD was not designed as a simple demonstration of isolated operations. The implementation already considers a real business flow, with relationships between entities, restrictions by user type, and consistency between event availability and reservation operations.
Figure 11: 
Evidence of user or event CRUD with a protected route

Notes: Created in Bruno
Figure 12: 
Reservation service fragment showing transactional logic

Notes: Created in Visual Code

5.1.6 Initial authentication and authorization
System authentication was implemented with `jsonwebtoken`. The flow allows users to register, authenticate valid credentials, and receive a token with basic user information, including `sub`, `email`, and `role`. From that point on, protected routes can verify the requester's identity through middleware.
Additionally, an administrative role authorization middleware was implemented to restrict sensitive operations, such as user administration or write operations on events.
The use of JWT enables decoupled authentication that is suitable for a REST API. By including the role inside the token and validating its content in middleware, the backend can distinguish between administrative users and client users, applying differentiated permissions from this first phase of the project.
Figure 13: 
JWT token correctly generated after login

Notes: Created in Bruno

Figure 14:
Restricted access test to an administrative route

Notes: Created in Bruno
5.1.7 Initial backend security
The first phase also incorporated the base security measures required for any backend exposed to external requests. These include:
- password hashing with `bcrypt`,
- authentication through `JWT`,
- use of `helmet` to strengthen HTTP headers,
- use of `cors` as the basis for origin control,
- global and authentication-specific rate limiting,
- use of environment variables to isolate sensitive configuration.
These decisions do not represent a complete and definitive security strategy, but they do establish a technically correct starting point for the next phases of the project.
The value of these measures lies in the fact that they were applied from the beginning and not as late corrections. This strengthens backend stability, reduces basic abuse risks, and better prepares the system for future demands in testing, concurrency, and deployment.
Figure 15: 
Rate limiting middleware configuration

Notes: Created in Visual Code
Figure 16: 
Evidence of the password hash stored in the database

Notes: Created in Power Shell
5.1.8 Environment variables
Backend configuration was decoupled from the code through `.env` and `.env.example` files. The variables used in this phase include `PORT`, `NODE_ENV`, `DATABASE_URL`, `DB_SSL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `BOOTSTRAP_ADMIN_EMAIL`, `GLOBAL_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`, and `RATE_LIMIT_WINDOW_MS`.
This practice makes it possible to maintain flexibility between local and cloud environments, while also avoiding the exposure of credentials directly in the repository.
The organization of these variables is also important from an academic perspective, since it demonstrates proper handling of sensitive configuration and prepares the project for different execution environments without the need to modify the main source code.

Figure 17: 
“env.example” file opened in the editor

Notes: Created in Visual Studio
5.1.9 HTTP error handling
Consistent HTTP response handling was implemented through dedicated middlewares for global errors and missing routes. As a result, the backend responds consistently to invalid validations, failed authentication, lack of permissions, functional conflicts, non-existing routes, and internal server errors.
This gives the API a clear communication base with the client, which improves maintainability, debugging, and integration experience.
This standardization allows the client to receive predictable responses and facilitates both testing and frontend integration. In addition, it prevents ambiguous responses or uncontrolled internal messages that could make debugging difficult or expose unnecessary information.
Figure 18: 
Test of a missing route returning `404`

Notes: Created in Bruno
Figure 19:
 Example of a structured JSON response from the backend

Notes: Created in Bruno
5.1.10 PostgreSQL connection and Neon preparation
System persistence was implemented using `pg` through `Pool`, which makes connection management more stable and reusable. During this stage, the PostgreSQL structure in Neon was prepared and the variables required for cloud integration were obtained (including `DATABASE_URL` and SSL configuration via `DB_SSL=true`). However, the execution of `schema.sql`, the loading of `seed.sql`, and the main functional validations were performed on local PostgreSQL during Phase 1.

Among the functional results of this setup are the correct response from the `health` endpoint, real event reads, registration and login against the local database, and the correct execution of the initial relational model.

Neon preparation was an important step because it left the cloud database component and the required environment variables ready for later deployment stages. At the same time, carrying out insertions, queries, and main tests in the local environment made it possible to keep direct control over the technical process during this stage of the project.
Figure 20: 
Console or `health` endpoint showing `database: "connected"`

Notes: Created in Bruno
Figure 21: 
Response of events retrieved from PostgreSQL

Notes: Created in Bruno

Figure 22:
Neon dashboard with the active instance

Notes: Created in Neon
5.1.11 Database model
The initial relational model of the system was composed of three main tables:
- `users`, for storing users, roles, unique email, and password hash.
- `events`, for event information, capacity, available tickets, price, and status.
- `reservations`, for the relationship between user and event, reserved quantity, reservation status, and payment status.
Additionally, foreign keys, `CHECK` constraints, and indexes for frequent queries were incorporated. The editable model diagram was documented in `docs/DB_DIAGRAM.md`.
This model was designed to reflect the basic relationship between users, events, and reservations, which constitutes the core of the project's functional domain. The presence of constraints and indexes from the initial phase improves data integrity and leaves a more consistent foundation for future expansions.

Figure 23:
Editable database diagram

Notes: Created in Lucichard
Figure 24: 
“schema.sql” file showing tables and main constraints

Notes: Created in Visual Studio
5.1.12 Initial concurrency strategy
Phase 1 already incorporates a technical foundation designed for concurrent scenarios, especially in the reservations module. When a user attempts to reserve tickets, the operation uses transactions and row locking over the queried event to prevent overselling or inconsistencies in the available inventory.
This decision does not yet represent a massive high-concurrency strategy, but it does demonstrate that the project was designed with transactional integrity criteria from its functional foundation.
From a business perspective, this logic is essential. An event system with limited inventory must protect ticket consistency when multiple users perform simultaneous operations. For that reason, Phase 1 already incorporates a correct approach to reduce the risk of overselling.
Figure 25:
Fragment of the reservation service showing “BEGIN”, “FOR UPDATE”, or controlled ticket updates

Notes: Created in Visual Studio
5.1.13 Testing strategy
Technical validation in Phase 1 relied on three main levels:
- base automated tests with Jest and Supertest,
- real tests against PostgreSQL,
- initial concurrent tests with K6.
Thanks to this, the backend was not only developed but also verified through functional evidence on routes, authentication, HTTP responses, database behavior, and basic concurrent interactions.

This testing strategy was important because it made it possible to identify environment errors, configuration issues, and behavior under load from an early stage of the project. As a result, Phase 1 delivers not only implemented code, but also an initial set of reproducible validations.
Figure 26: 
Simple diagram of the testing strategy used in Phase 1

Notes: Created in Luci
5.1.14 Base automated tests
With Jest and Supertest, tests were executed on the `health` endpoint, missing route handling, and authentication. In total, `2 suites` and `5 passing tests` were validated, which served as the initial automated foundation for the project.

Although these tests do not yet cover the entire functional surface of the system, they do verify key routes and guarantee a minimum regression baseline for future modifications.
Figure 27: 
“Npm test” output showing “2 suites” and “5 passing tests”

Notes: Created in PowerShell
5.1.15 Real tests against the database
Real tests were performed using local PostgreSQL. The validations included connection through `pg`, schema and seed execution, real reads from endpoints, and real authentication using the database configured in the local environment.

These validations strengthen the technical credibility of the project because they demonstrate that the backend already interacts with a real database and does not depend exclusively on mocks or simulated structures. In addition, working locally during this stage made it possible to better control data loading, testing, and result reproducibility.
Figure 28: 
“GET /api/health” test with the database connected

Notes: Created in Bruno
Figure 29: 
“POST /api/auth/login” test against real PostgreSQL

Notes: Created in Bruno
5.1.16 Concurrent tests with K6
The K6 tool was used to execute an initial concurrent test in the local environment within the requested range of `50` to `100` virtual users. This process included a first failed run due to the server not being active, a second run affected by `rate limiting`, and a final local run prepared to obtain consistent results over the backend running with local PostgreSQL.

In the local validation executed with `50` virtual users for `30` seconds, `3000` HTTP requests, `1500` completed iterations, a `0.00%` error rate, and a latency of `p(95)=16.02ms` were recorded. Later, when the test was repeated with `100` virtual users during the same period, `6000` HTTP requests, `3000` completed iterations, a `0.00%` error rate, and a latency of `p(95)=15.49ms` were obtained.

These results show that, in the local basic concurrency validation scenario, the backend responded correctly on the endpoints used in the test, maintaining successful functional checks, zero HTTP errors, and low response times. As a result, the system's technical foundation demonstrates initial stability under a controlled concurrent load within the requested range for this stage.

The value of this test lies not only in the final result, but also in the diagnostic process. From the executed runs, it was possible to identify environment and configuration problems, apply corrections, and finally obtain a valid run as evidence of basic concurrency.


Figure 30: 
“k6 version” output

Notes: Created in PowerShell
Figure 31: 
First run with “connection refused” error

Notes: Created in K6
Figure 32: 
Second run affected by “rate limiting”

Notes: Created in K6
Figure 33:
Third final run with valid results

Notes: Created in K6
5.1.17 Detected technical incidents
During the development of Phase 1, three main incidents were identified:

- initial use of a connection configuration that was not suitable for local PostgreSQL testing,
- initial inability to execute K6 because the tool was not installed,
- massive request blocking in the second concurrent run due to `rate limiting` configuration.

Each of these incidents was corrected through concrete adjustments: reconfiguring the connection toward local PostgreSQL for functional validations, correctly installing K6, and temporarily increasing limits for concurrent testing.


Documenting these incidents is relevant because it demonstrates diagnostic capacity, technical traceability, and proper corrective decision-making. Instead of hiding the failures, they were recorded together with their cause and solution, strengthening the quality of the development process.


Figure 34:
Initial PostgreSQL connection error

Notes: Created in PowerShell
Figure 35: 
Evidence of correct K6 installation

Notes: Created in PowerShell
Figure 36: 
Comparison between the failed run and the final corrected run

Notes: Created in PowerShell
5.1.18 Obtained technical evidence
Among the main pieces of evidence from this phase are:

- `npm test` executed correctly,
- successful `GET /api/health` response with the database connected,
- real event reads from PostgreSQL,
- functional registration and login with JWT,
- K6 installation and execution,
- real concurrency results,
- Railway environment prepared for later phases,
- updated GitHub repository with the project's technical foundation.

Taken together, this evidence shows that Phase 1 is not limited to a theoretical proposal, but rather corresponds to a real, executable, connected backend foundation validated through concrete technical tests.
5.1.19 Initial frontend implementation
As a complement to the technical foundation developed in this phase, a first functional frontend version was implemented in React with the goal of providing a real interface for consuming the backend that had already been built. This incorporation allowed the project to stop depending exclusively on API-level testing and to include a visual layer consistent with the architecture proposed from the beginning.

The frontend implementation was structured as an application separated from the backend, maintaining the decoupled architecture principle defined for CROWDPASS. To achieve this, an independent React project was organized and connected to the backend through HTTP endpoint consumption, using a dedicated environment variable for the API base URL. This separation facilitates future deployment on Vercel and allows the interface to evolve without compromising server-side logic.
From a functional point of view, this initial frontend stage incorporated the essential views required to present the product through a more realistic user flow. An initial landing page, registration and login views, a public events view, a private customer view, a private administrator view, and special screens for `404` and maintenance were implemented. As a result, the experience is no longer limited to isolated endpoints, but now includes real navigation between public and protected routes.


Figure 37: 
React frontend structure opened in VS Code

Notes: Created in VisualStudio
Figure 38: 
“Frontend/.env.example” file showing the API base URL

Notes: Created in VisualStudio

5.1.20 Navigation and separation between public and private views
An important decision within this implementation was to clearly separate public navigation from private navigation. The public area groups the landing page, the events catalog, registration, and login, while the private area redirects the authenticated user to the appropriate space according to their role.

This separation adds coherence to the system experience because it prevents promotional views from being mixed with internal panels. In this way, an administrator enters a dashboard with access to user management, while a customer accesses a personal panel focused on reservations and events related to their account.

The adoption of `React Router` and protected routes also strengthens the application's structure, since it allows access to be controlled more accurately by role and aligns the frontend with the authorization logic already implemented in the backend.
Figure 39: 
Frontend landing page running in the browser

Notes: Created in LocalHost

Figure 40: 
Login or registration view in the frontend

Notes: Created in LocalHost
Figure 41: 
Private navigation with role-based dashboard

Notes: Created in LocalHost
5.1.21 Frontend integration with the API
The frontend was connected to the existing API in order to consume real functionality already available in the backend. The integrated flows include user registration, login, event listing, and private information retrieval according to the authenticated role.

This integration is relevant because it demonstrates technical continuity between both layers of the system. The backend is no longer validated only through external tools, but also from an interface that consumes structured JSON responses, stores session state on the client side, and reacts to authentication states and service errors.

Additionally, the frontend was prepared to detect temporary backend failures and show a maintenance or service-unavailable view, reinforcing coherence between user experience and the technical behavior of the system.

Figure 42: 
Events view consuming real data from the API

Notes: Created in LocalHost
Figure 43: 
Administrator dashboard showing users from the backend

Notes: Created in LocalHost
Figure 44: 
Customer dashboard showing reservations or personal space

Notes: Created in LocalHost
5.1.22 Special frontend screens: 404 and maintenance
As part of the frontend's functional coherence, special screens were also incorporated for non-standard navigation and availability scenarios. First, a `404` view was implemented for non-existent routes, making it possible to clearly inform the user when they try to access an invalid address within the application.
This screen is important because it prevents the experience from ending in a blank interface or contextless errors. Instead, the system maintains visual continuity and communicates in a controlled way that the requested route does not exist or is no longer available.
In addition, a maintenance or temporary service-unavailable view was implemented to respond to backend failures. This screen was designed to be activated when the frontend detects that the server is not responding correctly, making it possible to show a clearer visual state while the service recovers.
The incorporation of this view adds technical value because it connects the real behavior of the system with an appropriate visual response. In this way, if the server becomes saturated or stops responding during tests or temporary incidents, the user is not left facing ambiguous messages, but rather a screen consistent with the service situation.


Figure 45: 
Frontend “404” page in the browser

Notes: Created in LocalHost
Figure 46: 
Maintenance view shown when the server is unavailable

Notes: Created in LocalHost
Figure 47: 
Frontend returning to normal state after the service recovers

Notes: Created in LocalHost
5.1.23 Frontend Preparation for Deployment on Vercel
As part of the consolidation of the frontend within the project's cloud architecture, the initial configuration of the client was also carried out in `Vercel`. This configuration considered the use of the `frontend` folder as the root of the project, the compilation using `npm run build`, the publication of the generated result in `dist` and the definition of the `VITE_API_BASE_URL` variable to link the frontend with the deployed backend.

Additionally, as it is an application built with `React Router`, the configuration in `Vercel` also contemplates the appropriate resolution of client routes to avoid errors when reloading internal views such as login, events or dashboards. With this, the project not only maintains theoretical compatibility with decoupled hosting, but also leaves evidence of a real frontend configuration within the deployment environment defined for the official CROWDPASS architecture.
Figure 48: 
Frontend configuration reference ready for deployment on Vercel

Notes: Created in LocalHost
5.1.24 Technical value of the frontend incorporation
The initial incorporation of the frontend adds academic and technical value to the project because it demonstrates that the platform can already be navigated as a web product and not only as an API under construction. This improves understanding of the complete flow, facilitates future functional testing, and leaves a clear visual foundation for the system's progressive evolution.

As a consequence, the project no longer leaves only an executable and validated backend foundation, but also an initial connected interface, organized by roles and aligned with the decoupled architecture defined for CROWDPASS from the beginning.



PHASE 2 - FUNCTIONAL EXPANSION AND SYSTEM CONSOLIDATION
PHASE 2 corresponds to the intermediate delivery (Week 12 - 80%). This stage consolidates the project as a complete, deployable system, extending the Phase 1 foundation with full CRUD coverage, pagination, multiple user roles with authorization, production deployments (Vercel + Render + Neon), hardened CORS policies, and pre-deployment testing (unit/API + E2E + load).

5.2.1 Phase objective (Week 12 - 80%)
The objective of this phase is to move from an initial technical base to a stable and complete system that can be demonstrated in production, with end-to-end flows, role separation, controlled security boundaries, and evidence of stability under higher concurrency ranges.

5.2.2 Backend module (Node.js + Express on Render)
During Phase 2, the backend was expanded to cover the functional surface required for the intermediate milestone:

- Complete REST API modules: authentication, users, events, reservations, notifications, wallet, and payments.
- Pagination support for listing endpoints to keep response times stable at scale.
- Role-based authorization across sensitive routes, ensuring separation between customer, staff, organizer, admin, and superadmin capabilities.
- Hardened security and stability controls: JWT, bcrypt hashing, rate limiting policies, structured error responses, and database timeout handling for degraded scenarios.

Evidence (backend)
Figure 49:
Render service live and healthy (`GET /api/health` returning `database: connected`).

Figure 50:
Example of paginated listing response (`GET /api/events?page=1&limit=24`) including pagination metadata.

Figure 51:
Role-based authorization evidence: blocked access with `403` (attempt to access an admin/staff route with a customer token).

Figure 52:
Bruno collection showing successful login (`POST /api/auth/login`) returning a valid JWT token for a production user.

5.2.3 Database module (PostgreSQL on Neon)
In Phase 2 the persistence layer is fully deployed and functional in the cloud using Neon (PostgreSQL). The database is not treated as an optional dependency but as an operational component that supports the complete model and its integrity constraints.

Key points:
- Complete schema deployed on Neon using `schema.sql`, including tables, constraints, and indexes for operational queries.
- Seed data deployed using `seed.sql` to ensure initial users and events are available for verification and demonstrations.
- Transactional integrity preserved for inventory updates (reservations) and operational flows.
- SSL connectivity enforced via `DATABASE_URL` and `DB_SSL=true` in production configuration.

Evidence (database)
Figure 53:
Neon dashboard showing the active database project and connection status.

Figure 54:
SQL evidence of schema integrity (tables + constraints / indexes) from `schema.sql` and a verification query against Neon.

Figure 55:
Seed verification: query output showing seeded users and seeded events in Neon.

5.2.4 Frontend module (React on Vercel)
The frontend is deployed on Vercel and consumes the Render backend through `VITE_API_BASE_URL` pointing to the production API (`.../api`). In Phase 2, the frontend is no longer a local-only interface: it is part of the production evaluation, with correct routing, role navigation, and resilience screens.

Key points:
- Production configuration on Vercel with SPA route rewrites (React Router) to prevent 404 on refresh for internal routes (e.g., `/login`).
- Integration with the backend API through environment variables (`VITE_API_BASE_URL`).
- Role-based navigation and protected routes aligned with backend authorization.
- User-facing error screens (404 and maintenance) for predictable failures and service downtime.
- Responsive adjustments for core views to ensure usability on mobile and desktop.

Evidence (frontend)
Figure 56:
Vercel project configuration showing `frontend` as root directory and `VITE_API_BASE_URL` pointing to the production API.

Figure 57:
Frontend consuming production API: events list rendered from `GET /api/events` in the deployed environment.

Figure 58:
SPA route refresh fix evidence: `/login` refreshed without Vercel `404 NOT_FOUND`.

5.2.5 Testing and pre-deployment validation (Jest + Selenium + K6)
Phase 2 strengthens the test surface to reduce the risk of unexpected failures during review:

- Unit/API tests: Jest + Supertest validate key backend behavior and reduce regression risk.
- E2E functional tests: Selenium scripts executed by role (customer, staff, admin, organizer) to validate real navigation journeys.
- Load/concurrency tests: K6 scenarios executed against the service to validate higher concurrency expectations for Week 12.

Evidence (testing)
Figure 59:
`npm test` output with passing suites for backend validation.

Figure 60:
Selenium execution output for at least one role-based flow (e.g., customer register/login + basic navigation).

Figure 61:
K6 results for a server test range of approximately 1000 virtual users (summary including error rate and p(95)).

Figure 62:
K6 results for an increased range (up to 5000 virtual users), or staged ramp evidence showing system behavior under higher load.

5.2.6 Week 12 (80%) requirements mapping (verbatim + module evidence)
The following checklist is presented verbatim from the evaluation guide (Week 12) and mapped to the implemented modules and required evidence.

- CRUD completo y funcional.
  Backend: CRUD modules implemented for core entities and operational modules.
  Database: complete schema deployed and functional.
  Frontend: screens available to exercise CRUD flows by role.
  Evidence: Figures 50, 52, 55, 57.

- Control de paginados con tiempos de respuesta cómodos al cliente.
  Backend: listing endpoints return paginated data; API limits are enforced by query parameters.
  Frontend: list views consume paginated endpoints.
  Evidence: Figure 50 and an additional screenshot showing page navigation in the UI.

- Manejo de múltiples tipos de usuario.
  Backend: roles enforced with middleware authorization.
  Frontend: role-based dashboards and navigation.
  Evidence: Figure 51 and a role-based navigation screenshot.

- Proyecto subido al servidor, revisión de pruebas tal sea el caso.
  Backend: deployed on Render.
  Frontend: deployed on Vercel.
  Database: deployed on Neon.
  Evidence: Figures 49, 53, 56.

- Base de datos completa, conectada y funcional, mostrar diagrama en documentación.
  Database: complete schema, constraints, and seeded data in Neon.
  Evidence: Figures 53, 54, 55 and the editable DB diagram reference used by the team.

- CORS configurados para no aceptar peticiones de orígenes inesperados.
  Backend: whitelist-based CORS policy using `CORS_ORIGINS`, compatible with production and preview origins.
  Evidence: screenshot of Render environment variables + a successful preflight response.

- Realizar pruebas previas para evitar una caída inesperada en el servidor o sus servicios.
  Testing: K6 staged load tests executed before review; degraded-mode behavior documented if saturation is reached.
  Evidence: Figures 61 and 62.

- Autentificación y autorización debidamente implementados sea el caso.
  Backend: JWT authentication and role authorization for protected routes.
  Frontend: session handling and protected navigation aligned with backend permissions.
  Evidence: Figures 52 and 51.

- Ingreso mediante una cuenta de correo.
  Backend: login via email + password (`POST /api/auth/login`).
  Frontend: login form through the deployed UI.
  Evidence: Figure 52 and a frontend login screenshot.

- Manejar control de token expirados para mejora de seguridad, así como evitar acceder a rutas manualmente sin permiso.
  Backend: JWT expiration configured and invalid/expired token requests rejected with consistent status codes.
  Frontend: unauthorized requests lead to session clearing and redirect to login (controlled UX).
  Evidence: screenshot showing a 401 response handling and redirect behavior.

- Mostrar pantallas de errores previstos como caídas de servidor y respuestas a estos.
  Frontend: 404 page and maintenance/service unavailable view.
  Backend: structured error responses.
  Evidence: Figure 58 plus screenshots of the maintenance screen and 404 screen.

- Pruebas de test en el servidor con el proyecto en variables de aproximadamente 1000 - 5000.
  Testing: K6 concurrency evidence executed against the deployment, with staged results and thresholds.
  Evidence: Figures 61 and 62.

- Control de backups sea el caso.
  Database: Neon backup strategy described, including provider-level backup capabilities and operational plan for recovery.
  Evidence: screenshot from Neon dashboard showing backup/retention configuration (or provider backup section) and a short written plan.

PHASE 3 - FUNCTIONAL CLOSURE, OPTIMIZATION, AND FINAL DELIVERY
Subtitle to be developed.

Achieved milestone to be developed.

 ACHIEVED MILESTONE
Subtitle to be developed.

 CONCLUSION
Subtitle to be developed.

ANNEXES
Subtitle to be developed.

9. REFERENCES
Subtitle to be developed.

