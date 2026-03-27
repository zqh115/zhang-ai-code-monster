package com.zqh.zhangaicodemother.manager;

import com.aliyun.oss.OSS;
import com.aliyun.oss.model.PutObjectRequest;
import com.aliyun.oss.model.PutObjectResult;
import com.zqh.zhangaicodemother.config.AliOssConfig;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;

@Slf4j
@Component

public class OssManager {
    @Resource
    private AliOssConfig aliOssconfig;
    @Resource
    private OSS ossClient;

    public String uploadFile(String key, File file) {
        PutObjectRequest putObjectRequest = new PutObjectRequest(aliOssconfig.getBucketName(), key, file);
        PutObjectResult result = ossClient.putObject(putObjectRequest);
        if (result != null){
            //构建访问URL
            String url = String.format("https://%s.%s/%s", aliOssconfig.getBucketName(), aliOssconfig.getEndpoint(), key);
            log.info("上传成功：{}", url);
            return url;
        }else{
            log.error("上传失败");
            return null;
        }
    }
}
