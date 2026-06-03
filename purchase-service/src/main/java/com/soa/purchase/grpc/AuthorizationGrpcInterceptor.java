package com.soa.purchase.grpc;

import io.grpc.Context;
import io.grpc.Contexts;
import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import org.springframework.stereotype.Component;

@Component
public class AuthorizationGrpcInterceptor implements ServerInterceptor {

    public static final Context.Key<String> AUTHORIZATION_KEY = Context.key("authorization");

    private static final Metadata.Key<String> AUTHORIZATION_HEADER =
            Metadata.Key.of("authorization", Metadata.ASCII_STRING_MARSHALLER);

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            ServerCall<ReqT, RespT> call,
            Metadata headers,
            ServerCallHandler<ReqT, RespT> next) {
        String authorization = headers.get(AUTHORIZATION_HEADER);
        Context context = Context.current().withValue(AUTHORIZATION_KEY, authorization);
        return Contexts.interceptCall(context, call, headers, next);
    }
}
