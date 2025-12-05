import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'lounge.g.dart';

@JsonSerializable()
class Lounge extends Equatable {
  final String id;
  final String name;
  final String ownerId;
  final String universityId;
  final String campusId;
  final String? description;
  final String? logo;
  final OperatingHours? operatingHours;
  final bool isApproved;
  final bool isActive;
  final Rating rating;
  final DateTime createdAt;
  final DateTime updatedAt;

  const Lounge({
    required this.id,
    required this.name,
    required this.ownerId,
    required this.universityId,
    required this.campusId,
    this.description,
    this.logo,
    this.operatingHours,
    required this.isApproved,
    required this.isActive,
    required this.rating,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Lounge.fromJson(Map<String, dynamic> json) => _$LoungeFromJson(json);
  Map<String, dynamic> toJson() => _$LoungeToJson(this);

  @override
  List<Object?> get props => [
        id,
        name,
        ownerId,
        universityId,
        campusId,
        description,
        logo,
        operatingHours,
        isApproved,
        isActive,
        rating,
        createdAt,
        updatedAt,
      ];
}

@JsonSerializable()
class OperatingHours extends Equatable {
  final String? opening;
  final String? closing;

  const OperatingHours({
    this.opening,
    this.closing,
  });

  factory OperatingHours.fromJson(Map<String, dynamic> json) =>
      _$OperatingHoursFromJson(json);
  Map<String, dynamic> toJson() => _$OperatingHoursToJson(this);

  @override
  List<Object?> get props => [opening, closing];
}

@JsonSerializable()
class Rating extends Equatable {
  final double average;
  final int count;

  const Rating({
    required this.average,
    required this.count,
  });

  factory Rating.fromJson(Map<String, dynamic> json) => _$RatingFromJson(json);
  Map<String, dynamic> toJson() => _$RatingToJson(this);

  @override
  List<Object?> get props => [average, count];
}
