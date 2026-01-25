// Firestore REST API helper for field selection (excludes heavy fields like photos)
import { auth } from './firebase';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreValue {
    stringValue?: string;
    integerValue?: string;
    doubleValue?: number;
    booleanValue?: boolean;
    timestampValue?: string;
    nullValue?: null;
    mapValue?: { fields: Record<string, FirestoreValue> };
    arrayValue?: { values: FirestoreValue[] };
}

interface FirestoreDocument {
    name: string;
    fields: Record<string, FirestoreValue>;
    createTime?: string;
    updateTime?: string;
}

// Convert Firestore value to JavaScript value
function convertValue(value: FirestoreValue): any {
    if (value.stringValue !== undefined) return value.stringValue;
    if (value.integerValue !== undefined) return parseInt(value.integerValue);
    if (value.doubleValue !== undefined) return value.doubleValue;
    if (value.booleanValue !== undefined) return value.booleanValue;
    if (value.timestampValue !== undefined) return new Date(value.timestampValue);
    if (value.nullValue !== undefined) return null;
    if (value.mapValue) {
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(value.mapValue.fields)) {
            result[key] = convertValue(val);
        }
        return result;
    }
    if (value.arrayValue) {
        return (value.arrayValue.values || []).map(convertValue);
    }
    return null;
}

// Convert Firestore document to JavaScript object
function convertDocument(doc: FirestoreDocument): Record<string, any> {
    const result: Record<string, any> = {};
    const docPath = doc.name.split('/');
    result.id = docPath[docPath.length - 1];

    for (const [key, value] of Object.entries(doc.fields || {})) {
        result[key] = convertValue(value);
    }
    return result;
}

// Get auth token for REST API
async function getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
}

// Query attendance WITHOUT photo field using REST API with field mask
export async function getAttendanceByDateRangeWithoutPhoto(
    startDate: Date,
    endDate: Date,
    limitCount: number = 500
): Promise<any[]> {
    const token = await getAuthToken();
    if (!token) {
        console.error('No auth token available');
        return [];
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fields to fetch (EXCLUDES photo!)
    const fieldsToFetch = [
        'employeeId',
        'employeeName',
        'date',
        'checkIn',
        'checkOut',
        'status',
        'location',
        'latitude',
        'longitude',
        'locationNote',
        'distance',
        'lateMinutes'
    ];

    // Firestore REST API structured query
    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'attendance' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'date' },
                                op: 'GREATER_THAN_OR_EQUAL',
                                value: { timestampValue: start.toISOString() }
                            }
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: 'date' },
                                op: 'LESS_THAN_OR_EQUAL',
                                value: { timestampValue: end.toISOString() }
                            }
                        }
                    ]
                }
            },
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            select: {
                fields: fieldsToFetch.map(f => ({ fieldPath: f }))
            },
            limit: limitCount
        }
    };

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Firestore REST API error:', error);
            return [];
        }

        const data = await response.json();

        // Convert response to JavaScript objects
        const results: any[] = [];
        for (const item of data) {
            if (item.document) {
                results.push(convertDocument(item.document));
            }
        }

        return results;
    } catch (error) {
        console.error('Error fetching attendance via REST:', error);
        return [];
    }
}

// Query leave requests WITHOUT attachment field
export async function getLeaveByDateRangeWithoutAttachment(
    startDate: Date,
    endDate: Date,
    limitCount: number = 200
): Promise<any[]> {
    const token = await getAuthToken();
    if (!token) {
        console.error('No auth token available');
        return [];
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fields to fetch (EXCLUDES attachment!)
    const fieldsToFetch = [
        'employeeId',
        'employeeName',
        'leaveType',
        'startDate',
        'endDate',
        'reason',
        'status',
        'createdAt',
        'rejectionReason'
    ];

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'leaveRequests' }],
            where: {
                compositeFilter: {
                    op: 'AND',
                    filters: [
                        {
                            fieldFilter: {
                                field: { fieldPath: 'startDate' },
                                op: 'GREATER_THAN_OR_EQUAL',
                                value: { timestampValue: start.toISOString() }
                            }
                        },
                        {
                            fieldFilter: {
                                field: { fieldPath: 'startDate' },
                                op: 'LESS_THAN_OR_EQUAL',
                                value: { timestampValue: end.toISOString() }
                            }
                        }
                    ]
                }
            },
            orderBy: [{ field: { fieldPath: 'startDate' }, direction: 'DESCENDING' }],
            select: {
                fields: fieldsToFetch.map(f => ({ fieldPath: f }))
            },
            limit: limitCount
        }
    };

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Firestore REST API error:', error);
            return [];
        }

        const data = await response.json();

        const results: any[] = [];
        for (const item of data) {
            if (item.document) {
                results.push(convertDocument(item.document));
            }
        }

        return results;
    } catch (error) {
        console.error('Error fetching leaves via REST:', error);
        return [];
    }
}

// Query attendance for specific employee WITHOUT photo field
export async function getAttendanceByEmployeeIdWithoutPhoto(
    employeeId: string,
    limitCount: number = 100
): Promise<any[]> {
    const token = await getAuthToken();
    if (!token) {
        console.error('No auth token available');
        return [];
    }

    // Fields to fetch (EXCLUDES photo!)
    const fieldsToFetch = [
        'employeeId',
        'employeeName',
        'date',
        'checkIn',
        'checkOut',
        'status',
        'location',
        'latitude',
        'longitude',
        'locationNote',
        'distance',
        'lateMinutes'
    ];

    const queryBody = {
        structuredQuery: {
            from: [{ collectionId: 'attendance' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'employeeId' },
                    op: 'EQUAL',
                    value: { stringValue: employeeId }
                }
            },
            orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
            select: {
                fields: fieldsToFetch.map(f => ({ fieldPath: f }))
            },
            limit: limitCount
        }
    };

    try {
        const response = await fetch(
            `${FIRESTORE_BASE_URL}:runQuery`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queryBody)
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Firestore REST API error:', error);
            return [];
        }

        const data = await response.json();

        const results: any[] = [];
        for (const item of data) {
            if (item.document) {
                results.push(convertDocument(item.document));
            }
        }

        return results;
    } catch (error) {
        console.error('Error fetching employee attendance via REST:', error);
        return [];
    }
}

