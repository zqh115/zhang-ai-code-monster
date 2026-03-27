package com.zqh.zhangaicodemother.config;

import com.aliyun.oss.OSS;
import com.aliyun.oss.OSSClientBuilder;
import com.aliyun.oss.common.auth.CredentialsProviderFactory;
import com.aliyun.oss.common.auth.EnvironmentVariableCredentialsProvider;
import com.aliyuncs.exceptions.ClientException;
import com.zqh.zhangaicodemother.exception.BusinessException;
import com.zqh.zhangaicodemother.exception.ErrorCode;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Data
@ConfigurationProperties(prefix = "aliyun.oss")
public class AliOssConfig  {
    private String endpoint;
    private String bucketName;
    private String region;
    private String accessKeyId;
    private String accessKeySecret;
    @Bean
    public OSS ossClient() throws ClientException {
        return new OSSClientBuilder().build(endpoint, accessKeyId, accessKeySecret);
    }
}
