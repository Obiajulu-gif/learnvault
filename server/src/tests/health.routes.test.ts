jest.mock("../db/index", () => ({
	pool: {
		query: jest.fn(),
	},
	getPgStatStatementsSnapshot: jest.fn(),
}))

jest.mock("../services/stellar-contract.service", () => ({
	stellarContractService: {
		getCircuitBreakerState: jest.fn(() => ({
			state: "CLOSED",
			consecutiveFailures: 0,
			failureThreshold: 5,
			resetTimeoutMs: 30000,
			openedAt: null,
			nextProbeAt: null,
			halfOpenProbeInFlight: false,
		})),
	},
}))

import express from "express"
import request from "supertest"
import { pool } from "../db/index"
import { healthRouter } from "../routes/health.routes"

const mockedQuery = pool.query as jest.Mock

function buildApp() {
	const app = express()
	app.use("/api", healthRouter)
	return app
}

describe("GET /api/health", () => {
	beforeEach(() => {
		mockedQuery.mockReset()
	})

	it("returns stellar RPC circuit state in health payload", async () => {
		mockedQuery.mockResolvedValueOnce({ rows: [{ one: 1 }] })

		const res = await request(buildApp()).get("/api/health")

		expect(res.status).toBe(200)
		expect(res.body).toEqual(
			expect.objectContaining({
				status: "ok",
				db: "connected",
				stellarRpc: expect.objectContaining({
					state: "CLOSED",
					failureThreshold: 5,
				}),
			}),
		)
	})
})
