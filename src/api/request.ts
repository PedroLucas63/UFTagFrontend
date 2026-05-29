import axios, { AxiosResponse } from "axios";

type ErrorMap = Record<number, string>;

export type ApiSuccess<T> = {
   ok: true;
   data: T;
   status: number;
};

export type ApiFailure = {
   ok: false;
   error: string;
   status?: number;
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export type RequestOptions = {
   errorMap?: ErrorMap;
   fallbackError?: string;
};

function extractErrorMessage(
   data: unknown
): string | null {
   if (!data || typeof data !== "object") {
      return null;
   }

   const typedData =
      data as Record<string, unknown>;

   if (
      typedData.errors &&
      typeof typedData.errors === "object"
   ) {
      const messages = Object.values(
         typedData.errors as Record<
            string,
            unknown
         >
      )
         .flat()
         .map((message) =>
            String(message)
         )
         .join("\n");

      if (messages) {
         return messages;
      }
   }

   if (typeof typedData.message === "string") {
      return typedData.message;
   }

   return null;
}

export async function request<T>(
   promise: Promise<AxiosResponse<T>>,
   options: RequestOptions = {}
): Promise<ApiResult<T>> {
   try {
      const response = await promise;

      return {
         ok: true,
         data: response.data,
         status: response.status,
      };
   } catch (error) {
      if (axios.isAxiosError(error)) {
         if (!error.response) {
            return {
               ok: false,
               error: "Server unavailable",
            };
         }

         const status = error.response.status;
         const mapped =
            options.errorMap?.[status];

         if (mapped) {
            return {
               ok: false,
               error: mapped,
               status,
            };
         }

         const extracted =
            extractErrorMessage(
               error.response.data
            );

         if (extracted) {
            return {
               ok: false,
               error: extracted,
               status,
            };
         }

         return {
            ok: false,
            error:
               options.fallbackError ??
               "Falha na requisição",
            status,
         };
      }

      return {
         ok: false,
         error:
            options.fallbackError ??
            "Falha na requisição",
      };
   }
}
