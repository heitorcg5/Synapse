package com.synapse.modules.knowledge.entity;

import com.pgvector.PGvector;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter(autoApply = true)
public class VectorConverter implements AttributeConverter<List<Float>, PGvector> {

    @Override
    public PGvector convertToDatabaseColumn(List<Float> attribute) {
        if (attribute == null) return null;
        float[] arr = new float[attribute.size()];
        for (int i = 0; i < attribute.size(); i++) {
            arr[i] = attribute.get(i);
        }
        return new PGvector(arr);
    }

    @Override
    public List<Float> convertToEntityAttribute(PGvector dbData) {
        if (dbData == null) return null;
        float[] arr = dbData.toArray();
        List<Float> list = new java.util.ArrayList<>(arr.length);
        for (float v : arr) {
            list.add(v);
        }
        return list;
    }
}
