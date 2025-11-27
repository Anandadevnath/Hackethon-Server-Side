# Hackathon_server_side — API for Farmer Platform

This README documents the HTTP API for frontend developers: endpoints, request bodies, responses, and authentication flow.

**Server**
- **Run:** `npm install` then `npm start` (or `npm run dev` if you use nodemon).
- **Base paths:**
  - User routes mounted at: `/user`
  - Crop batch routes mounted at: `/crop`

**Authentication**
- This API uses JWT access tokens for authenticated endpoints.
- Typical flow:
  1. Register (`POST /user/register`) — server returns a verification token on the created user object (short lived).
  2. Verify email (`POST /user/verify`) — send header `Authorization: Bearer <VERIFICATION_TOKEN>`.
  3. Login (`POST /user/login`) — server returns an `accessToken` and `refreshToken`.
- Token notes:
  - Verification token expiry: 10 minutes (used for email verification).
  - Access token expiry: 10 days.
  - Refresh token expiry: 30 days.

**Headers**
- JSON requests: `Content-Type: application/json`
- Authenticated requests: `Authorization: Bearer <ACCESS_TOKEN>`

**User endpoints**
- `POST /user/register` — register a farmer (required fields)
  - Body (JSON):
    ```json
    {
      "name": "Abdul Karim",
      "email": "abdul.karim+test@example.com",
      "phone": "+8801712345678",
      "password": "StrongP@ssw0rd",
      "preferredLanguage": "bn",
      "location": { "division": "Dhaka", "district": "Gazipur", "upazila": "Sreepur" }
    }
    ```
  - Response: `201` with created user object (includes `token` used for verification).

- `POST /user/verify` — verify email
  - Header: `Authorization: Bearer <VERIFICATION_TOKEN>`
  - Response: `200` on success.

- `POST /user/login` — login
  - Body:
    ```json
    { "email": "abdul.karim+test@example.com", "password": "StrongP@ssw0rd" }
    ```
  - Response: `200` with `accessToken`, `refreshToken`, and `user` object.

- `PATCH /user/update` — update current farmer profile (authenticated)
  - Header: `Authorization: Bearer <ACCESS_TOKEN>`
  - Body (any of the allowed fields; partial updates allowed):
    ```json
    { "name": "New Name", "phone": "+8801712345678", "preferredLanguage": "en", "avatar": "https://...", "location": { "district": "Gazipur" } }
    ```
  - Response: `200` with updated user object.

**Crop batch endpoints**
- Only verified farmers may create crop batch records.

- `POST /crop/` — register a new harvested batch (authenticated & verified)
  - Header: `Authorization: Bearer <ACCESS_TOKEN>`
  - Body:
    ```json
    {
      "cropType": "Paddy",
      "estimatedWeightKg": 1200,
      "harvestDate": "2025-11-20",
      "storageLocation": { "division": "Dhaka", "district": "Gazipur" },
      "storageType": "Jute Bag Stack",
      "notes": "Harvested in morning, stored under shed."
    }
    ```
  - Response: `201` with created batch object.

- `GET /crop/` — list batches for the authenticated farmer
  - Header: `Authorization: Bearer <ACCESS_TOKEN>`
  - Response: `200` with an array of batch objects (most recent first).

- `PATCH /crop/update/:id` — edit an existing batch (authenticated farmer who owns the batch)
  - Header: `Authorization: Bearer <ACCESS_TOKEN>`
  - Body: partial fields to update (example):
    ```json
    { "estimatedWeightKg": 1550, "notes": "Final weight after reconciliation." }
    ```
  - Response: `200` with updated batch object.

**Validation & Errors**
- Validation errors return `400` with JSON:
  ```json
  { "success": false, "errors": ["field error message", ...] }
  ```
- Auth errors return `401` (missing/invalid token) or `403` (not permitted)
- Not found returns `404`
- Server errors return `500`

**Sample test flow (curl, PowerShell)**
1. Register:
```powershell
curl -X POST http://localhost:3000/user/register \
 -H "Content-Type: application/json" \
 -d '{"name":"Abdul","email":"abdul.test@example.com","phone":"+8801712345678","password":"StrongP@ssw0rd","location":{"division":"Dhaka","district":"Gazipur","upazila":"Sreepur"}}'
```
2. Verify (use the `token` from register response):
```powershell
curl -X POST http://localhost:3000/user/verify -H "Authorization: Bearer <VERIFICATION_TOKEN>"
```
3. Login:
```powershell
curl -X POST http://localhost:3000/user/login -H "Content-Type: application/json" -d '{"email":"abdul.test@example.com","password":"StrongP@ssw0rd"}'
```
4. Create crop batch (replace `<ACCESS_TOKEN>`):
```powershell
curl -X POST http://localhost:3000/crop/ -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"cropType":"Paddy","estimatedWeightKg":1200,"harvestDate":"2025-11-20","storageLocation":{"division":"Dhaka","district":"Gazipur"},"storageType":"Jute Bag Stack"}'
```

**Data shapes (short)**
- Farmer (example fields):
  - `_id`, `name`, `email`, `phone`, `preferredLanguage` (`bn`|`en`), `location` (division/district/upazila), `role`, `isVerified`, `isLoggedIn`, timestamps
- CropBatch:
  - `_id`, `farmerId`, `cropType` (`Paddy`|`Rice`), `estimatedWeightKg` (number), `harvestDate` (ISO string), `storageLocation` (division, district), `storageType` (string), `notes`, timestamps

**Helpful tips for frontend**
- Save `accessToken` in memory (not localStorage) if possible. If you store it, prefer `httpOnly` cookies served by the backend (not implemented currently).
- Use the `accessToken` in the `Authorization` header: `Authorization: Bearer <ACCESS_TOKEN>`.
- The register endpoint returns a short-lived verification token; pass it to `POST /user/verify` in the `Authorization` header.
- For development, if you can't perform email verification, toggle `isVerified` directly in the database for testing.
- The server exposes a static `data/storage_locations.json` list — you can build dropdowns from it.

**If you need**
- A Postman collection or a small test script to run the end-to-end flow, I can add one.
- If you prefer `PATCH /user/update` to be `PATCH /user/me` or different paths, tell me and I'll change it.

---
File references:
- `server.js` — route mounts
- `routes/userRoute.js`, `routes/cropRoute.js`
- `controllers/userController.js`, `controllers/cropBatchController.js`
- `models/userModel.js`, `models/cropBatchModel.js`
- `validators/*` — request validation

If you want, I can also add a small Postman collection file or a scripted test runner (Node script) that performs register → verify → login → create batch → update batch automatically.